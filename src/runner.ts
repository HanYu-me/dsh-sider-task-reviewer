/**
 * Run one review through the harness LLM service.
 *
 * - quick: one call; the reviewer reads the conversation and the workspace snapshot.
 * - deep: a small loop of its own (not the agent loop): the reviewer may call
 *   the four read-only workspace tools, at most `maxToolCalls` times, then
 *   answers. A route that cannot call tools falls back to quick.
 *
 * No `sessionId` is put on the request: adapters that keep one process per
 * conversation (Oh My Claude resumes the conversation's Claude Code process
 * when it sees one) would run the review inside the reviewed conversation.
 * @module dsh-sider-task-reviewer/runner
 */
import { BlockAssembler, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, FinishReason, GenerateOptions, RequestMessage, StreamChunk } from '@deepseek-ai/dsh-llm'
import { ANSWER_NOW, FINISH_NOW } from './prompt'
import { addCounts, redact } from './redact'
import type { ModelRoute, ReviewDepth, ReviewToolUse } from './shared/protocol'
import { runTool, TOOL_SCHEMAS, toolTarget } from './workspace'

/** The one method of the `llm` service a review needs. */
export interface LlmStreamFace {
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>
}

export interface RunInput {
  llm: LlmStreamFace
  route: ModelRoute
  depth: ReviewDepth
  system: string
  prompt: string
  /** Where the deep tools may look: the working directory first, then the repositories of the written files. */
  roots?: readonly string[]
  /** Reasoning effort id for the route, when one was picked. */
  effort?: string
  maxToolCalls: number
  maxTokens: number
  timeoutMs: number
  signal: AbortSignal
  onPhase?(phase: string): void
  onDelta?(text: string): void
  onTool?(use: ReviewToolUse): void
}

export interface RunOutput {
  /** The reviewer's final answer. */
  text: string
  usedDepth: ReviewDepth
  tools: ReviewToolUse[]
  notes: string[]
  /** Secrets taken out of tool results before they went to the reviewer. */
  redactions: Record<string, number>
}

/** A review that could not finish. */
export class ReviewError extends Error {
  constructor(message: string, readonly code: string = 'internal') {
    super(message)
    this.name = 'ReviewError'
  }
}

function describeFinish(reason: FinishReason): string | undefined {
  switch (reason.kind) {
    case 'stop':
    case 'tool-calls':
      return undefined
    case 'max-tokens':
      return '模型输出达到长度上限'
    case 'error':
    case 'aborted':
      return `${reason.failure.message}${reason.failure.code !== '' ? `（${reason.failure.code}）` : ''}`
    default:
      return String((reason as { kind?: unknown }).kind ?? reason)
  }
}

/** Whether a failure looks like "this route cannot take tools". */
function toolsUnsupported(message: string): boolean {
  return /tool|function[_ ]?call|not support|unsupported|不支持/i.test(message)
}

interface CallResult {
  blocks: ContentBlock[]
  finish: FinishReason
  assembler: BlockAssembler
}

async function streamOnce(input: RunInput, options: GenerateOptions, signal: AbortSignal): Promise<CallResult> {
  const assembler = new BlockAssembler()
  const iterator = input.llm.stream({ ...options, signal })[Symbol.asyncIterator]()
  let onAbort: (() => void) | undefined
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  })
  let exhausted = false
  try {
    for (;;) {
      const next = await Promise.race([iterator.next(), aborted])
      if (next.done) {
        exhausted = true
        break
      }
      assembler.push(next.value)
      if (next.value.type === 'text-delta') {
        try {
          input.onDelta?.(next.value.text)
        } catch {
          // Display only.
        }
      }
    }
  } finally {
    if (onAbort !== undefined) signal.removeEventListener('abort', onAbort)
    if (!exhausted) void Promise.resolve(iterator.return?.()).catch(() => {})
  }
  return { blocks: assembler.blocks(), finish: assembler.finish, assembler }
}

function textOfBlocks(blocks: readonly ContentBlock[]): string {
  return blocks
    .filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

/**
 * Run the review.
 * @throws ReviewError when the model fails, times out or is cancelled.
 */
export async function runReview(input: RunInput): Promise<RunOutput> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, input.timeoutMs)
  const onCaller = (): void => controller.abort()
  if (input.signal.aborted) controller.abort()
  else input.signal.addEventListener('abort', onCaller, { once: true })
  const notes: string[] = []
  const tools: ReviewToolUse[] = []
  const redactions: Record<string, number> = {}
  const base: Omit<GenerateOptions, 'messages'> = {
    provider: input.route.provider,
    model: input.route.model,
    system: input.system,
    maxTokens: input.maxTokens,
    temperature: 0.2,
    ...(input.effort !== undefined ? { reasoningEffort: input.effort as GenerateOptions['reasoningEffort'] } : {}),
  }
  const first: RequestMessage = { role: 'user', content: [{ type: 'text', text: input.prompt }] }
  try {
    const quick = async (): Promise<RunOutput> => {
      input.onPhase?.('等待审查模型回答')
      let result = await streamOnce(input, { ...base, messages: [first] }, controller.signal)
      // A reasoning model can think its whole budget away and write nothing: once more, with room and a nudge.
      if (result.finish.kind === 'max-tokens' && textOfBlocks(result.blocks) === '') {
        notes.push('审查模型第一次思考用完了输出长度，已加大额度重试')
        input.onPhase?.('审查模型没写出结论，重试中')
        result = await streamOnce(input, { ...base, maxTokens: Math.min(input.maxTokens * 2, 64_000), messages: [first, { role: 'user', content: [{ type: 'text', text: ANSWER_NOW }] }] }, controller.signal)
      }
      const problem = describeFinish(result.finish)
      const text = textOfBlocks(result.blocks)
      if (problem !== undefined && text === '') throw new ReviewError(`审查模型出错：${problem}`, 'upstream')
      if (problem !== undefined) notes.push(problem)
      // An agent-style provider (it runs its own tools) may stop at its first tool step and hand that back instead of an answer.
      if (text === '' && result.blocks.some((block) => block.type === 'tool-call')) {
        throw new ReviewError('审查模型想自己调用工具，没有给出结论：它可能是会自己用工具的代理型模型。换一个审查模型试试', 'empty')
      }
      if (text === '') throw new ReviewError('审查模型没有给出回答', 'empty')
      return { text, usedDepth: 'quick', tools, notes, redactions }
    }
    const roots = input.roots ?? []
    if (input.depth === 'quick' || roots.length === 0) {
      if (input.depth === 'deep') notes.push('没有可以查看的工作区，深入模式退回为快速模式')
      return await quick()
    }

    const messages: RequestMessage[] = [first]
    let calls = 0
    let nudged = false
    for (let round = 0; round < input.maxToolCalls + 2; round++) {
      input.onPhase?.(round === 0 ? '等待审查模型（可查看文件）' : '审查模型继续核实')
      let result: CallResult
      try {
        // Tools stay declared even when the budget is spent: some providers refuse a history with tool calls and no tools.
        result = await streamOnce(input, { ...base, messages, tools: TOOL_SCHEMAS }, controller.signal)
      } catch (error) {
        if (round === 0 && !controller.signal.aborted && toolsUnsupported(error instanceof Error ? error.message : String(error))) {
          notes.push('这个模型不能调用工具，已退回快速模式')
          return await quick()
        }
        throw error
      }
      const problem = describeFinish(result.finish)
      if (problem !== undefined && round === 0 && (result.finish.kind === 'error' || result.finish.kind === 'aborted') && !controller.signal.aborted && toolsUnsupported(problem)) {
        notes.push('这个模型不能调用工具，已退回快速模式')
        return await quick()
      }
      const toolCalls = result.blocks.filter((block): block is Extract<ContentBlock, { type: 'tool-call' }> => block.type === 'tool-call')
      if (toolCalls.length === 0) {
        const text = textOfBlocks(result.blocks)
        if (text === '' && result.finish.kind === 'max-tokens' && !nudged) {
          nudged = true
          notes.push('审查模型思考用完了输出长度，已提示它直接给结论')
          messages.push({ role: 'user', content: [{ type: 'text', text: ANSWER_NOW }] })
          continue
        }
        if (problem !== undefined && text === '') throw new ReviewError(`审查模型出错：${problem}`, 'upstream')
        if (problem !== undefined) notes.push(problem)
        if (text === '') throw new ReviewError('审查模型没有给出回答', 'empty')
        return { text, usedDepth: 'deep', tools, notes, redactions }
      }
      messages.push(result.assembler.message({ provider: input.route.provider, model: input.route.model, ...(result.assembler.replayState !== undefined ? { replayState: result.assembler.replayState } : {}) }))
      for (const call of toolCalls) {
        let text: string
        let ok: boolean
        if (calls >= input.maxToolCalls) {
          text = FINISH_NOW
          ok = false
        } else {
          calls += 1
          const ran = await runTool(roots, call.name, call.arguments)
          const use: ReviewToolUse = { name: call.name, target: toolTarget(call.name, ran.input), ok: ran.ok }
          tools.push(use)
          input.onTool?.(use)
          input.onPhase?.(`${call.name === 'read_file' ? '读' : call.name === 'list_dir' ? '列出' : call.name === 'search' ? '搜索' : ''} ${use.target}`.trim())
          const cleaned = redact(ran.text)
          addCounts(redactions, cleaned.counts)
          text = cleaned.text
          ok = ran.ok
        }
        messages.push(createToolResultMessage({ callId: call.id, content: [{ type: 'text', text }], isError: !ok }))
      }
      if (calls >= input.maxToolCalls) messages.push({ role: 'user', content: [{ type: 'text', text: FINISH_NOW }] })
    }
    throw new ReviewError('审查模型一直在调用工具，没有给出结论', 'loop')
  } catch (error) {
    if (error instanceof ReviewError) throw error
    if (timedOut) throw new ReviewError(`审查超时（${Math.round(input.timeoutMs / 1000)} 秒）`, 'timeout')
    if (controller.signal.aborted) throw new ReviewError('审查已取消', 'cancelled')
    throw new ReviewError(error instanceof Error ? error.message : String(error))
  } finally {
    clearTimeout(timer)
    input.signal.removeEventListener('abort', onCaller)
  }
}
