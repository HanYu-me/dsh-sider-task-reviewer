/**
 * Builders for session logs and fake model streams shared by the tests.
 */
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import type { LogEvent } from '../src/transcript'

export class Log {
  events: LogEvent[] = []
  private seq = 0
  private turn = 0
  private time = 1_700_000_000_000

  private push(type: string, data: unknown): this {
    this.events.push({ type, seq: this.seq++, time: (this.time += 1000), data })
    return this
  }

  start(): this {
    this.turn += 1
    return this.push('turn/start', { turn: this.turn })
  }

  user(text: string, kind = 'user'): this {
    return this.push('user/message', { id: `u${this.seq}`, role: 'user', content: [{ type: 'text', text }], source: { kind } })
  }

  say(text: string, step = 1): this {
    return this.push('assistant/message', { turn: this.turn, step, message: { role: 'assistant', content: [{ type: 'text', text }] }, stream: [] })
  }

  tool(name: string, args: unknown, result: string, options: { step?: number; error?: boolean } = {}): this {
    const callId = `c${this.seq}`
    this.push('tool/call', { turn: this.turn, step: options.step ?? 1, callId, name, arguments: JSON.stringify(args) })
    return this.push('tool/result', { turn: this.turn, step: options.step ?? 1, message: { role: 'tool', toolCallId: callId, content: [{ type: 'text', text: result }], ...(options.error === true ? { isError: true } : {}) } })
  }

  end(reason = 'success'): this {
    return this.push('turn/end', { turn: this.turn, reason: { kind: reason } })
  }

  step(): this {
    return this.push('step/end', { turn: this.turn, step: 1 })
  }
}

/** Chunks of a streamed text answer. */
export function textChunks(text: string, pieces = 3): StreamChunk[] {
  const size = Math.max(1, Math.ceil(text.length / pieces))
  const out: StreamChunk[] = [{ type: 'block-start', index: 0, blockType: 'text' }]
  for (let i = 0; i < text.length; i += size) out.push({ type: 'text-delta', index: 0, text: text.slice(i, i + size) })
  out.push({ type: 'block-end', index: 0, block: { type: 'text', text } })
  out.push({ type: 'finish', reason: { kind: 'stop' } })
  return out
}

/** Chunks of an answer that calls tools. */
export function toolChunks(calls: { id: string; name: string; args: unknown }[]): StreamChunk[] {
  const out: StreamChunk[] = []
  calls.forEach((call, index) => {
    const args = JSON.stringify(call.args)
    out.push({ type: 'block-start', index, blockType: 'tool-call' })
    out.push({ type: 'tool-call-delta', index, id: call.id as never, name: call.name, argumentsDelta: args })
    out.push({ type: 'block-end', index, block: { type: 'tool-call', id: call.id as never, name: call.name, arguments: args } })
  })
  out.push({ type: 'finish', reason: { kind: 'tool-calls' } })
  return out
}

export interface FakeCall {
  provider: string
  model: string
  tools?: unknown[]
  messages: unknown[]
  system?: string
  sessionId?: unknown
}

/** A fake `llm` service: answers each call with the next script entry. */
export function fakeLlm(script: Array<StreamChunk[] | Error | ((call: FakeCall) => StreamChunk[])>) {
  const calls: FakeCall[] = []
  let next = 0
  return {
    calls,
    stream(options: FakeCall): AsyncIterable<StreamChunk> {
      calls.push({ ...options, messages: [...options.messages] })
      const entry = script[Math.min(next++, script.length - 1)]!
      return {
        async *[Symbol.asyncIterator]() {
          if (entry instanceof Error) throw entry
          const chunks = typeof entry === 'function' ? entry(options) : entry
          for (const chunk of chunks) {
            await Promise.resolve()
            yield chunk
          }
        },
      }
    },
    listProviders: () => [{ id: 'p1', name: 'Provider One' }, { id: 'p2' }],
    listModels: async (provider: string) => (provider === 'p1' ? [{ id: 'm1', name: 'Model One' }] : []),
  }
}

export const GOOD_ANSWER = JSON.stringify({
  verdict: 'fail',
  summary: '说测试通过，但测试失败了。',
  findings: [{ severity: 'high', category: 'claim', title: '测试没有通过', detail: 'npm test 输出 2 failed', evidence: '第 1 轮 · 第 1 步 · bash', suggestion: '修复失败的测试' }],
  checked: ['改动范围与需求一致'],
})
