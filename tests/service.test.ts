import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { serveReviewer } from '../src/routes'
import { ReviewError, runReview } from '../src/runner'
import { DEFAULT_CONFIG, ReviewService, type AgentFace, type HostFaces, type SessionFace } from '../src/service'
import { createFileStore, createMemoryStore } from '../src/store'
import { fakeLlm, GOOD_ANSWER, Log, textChunks, toolChunks } from './fixtures'

let root: string
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'rv-svc-'))
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src', 'a.ts'), 'export const a = 1\n')
})
afterAll(() => rmSync(root, { recursive: true, force: true }))
afterEach(() => vi.useRealTimers())

const route = { provider: 'p1', model: 'm1' }

describe('runReview', () => {
  const base = { route, system: 'S', prompt: 'P', maxToolCalls: 3, maxTokens: 1000, timeoutMs: 5000, signal: new AbortController().signal }

  it('quick: one call without tools and without a session id; the text streams', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER)])
    const deltas: string[] = []
    const out = await runReview({ ...base, llm, depth: 'quick', roots: [root], onDelta: (text) => deltas.push(text) })
    expect(out.text).toBe(GOOD_ANSWER)
    expect(out.usedDepth).toBe('quick')
    expect(deltas.join('')).toBe(GOOD_ANSWER)
    expect(llm.calls).toHaveLength(1)
    expect(llm.calls[0]!.tools).toBeUndefined()
    expect(llm.calls[0]!.sessionId).toBeUndefined()
  })

  it('deep: runs the tools the reviewer asks for, hands the results back, then reads the answer', async () => {
    const llm = fakeLlm([toolChunks([{ id: 'c1', name: 'read_file', args: { path: 'src/a.ts' } }, { id: 'c2', name: 'read_file', args: { path: '../../etc/passwd' } }]), textChunks(GOOD_ANSWER)])
    const tools: string[] = []
    const out = await runReview({ ...base, llm, depth: 'deep', roots: [root], onTool: (tool) => tools.push(`${tool.name}:${tool.target}:${tool.ok}`) })
    expect(out.usedDepth).toBe('deep')
    expect(out.text).toBe(GOOD_ANSWER)
    expect(tools).toEqual(['read_file:src/a.ts:true', 'read_file:../../etc/passwd:false'])
    expect(llm.calls[0]!.tools).toHaveLength(4)
    const second = llm.calls[1]!.messages as Array<{ role: string; content: Array<{ text?: string }>; isError?: boolean }>
    expect(second.map((message) => message.role)).toEqual(['user', 'assistant', 'tool', 'tool'])
    expect(second[2]!.content[0]!.text).toContain('export const a = 1')
    expect(second[3]!.isError).toBe(true)
  })

  it('deep: stops handing out tools once the budget is spent', async () => {
    const call = (id: string) => toolChunks([{ id, name: 'list_dir', args: {} }])
    const llm = fakeLlm([call('a'), call('b'), call('c'), call('d'), textChunks(GOOD_ANSWER)])
    const out = await runReview({ ...base, llm, depth: 'deep', roots: [root] })
    expect(out.tools).toHaveLength(3)
    const last = llm.calls.at(-1)!.messages as Array<{ role: string; content: Array<{ text?: string }> }>
    expect(JSON.stringify(last)).toContain('工具调用次数已用完')
  })

  it('retries once with more room when the model thought its whole budget away', async () => {
    const empty = [{ type: 'finish', reason: { kind: 'max-tokens' } }] as never
    const llm = fakeLlm([empty, textChunks(GOOD_ANSWER)])
    const out = await runReview({ ...base, llm, depth: 'quick' })
    expect(out.text).toBe(GOOD_ANSWER)
    expect(out.notes.join()).toContain('重试')
    expect((llm.calls[1] as unknown as { maxTokens: number }).maxTokens).toBe(2000)
    expect(JSON.stringify(llm.calls[1]!.messages)).toContain('直接输出')
  })

  it('deep falls back to quick when the route cannot call tools, and says so', async () => {
    const llm = fakeLlm([new Error('this model does not support tools'), textChunks(GOOD_ANSWER)])
    const out = await runReview({ ...base, llm, depth: 'deep', roots: [root] })
    expect(out.usedDepth).toBe('quick')
    expect(out.notes.join()).toContain('退回快速模式')
  })

  it('reports model failures, timeouts and cancellation as ReviewError', async () => {
    const failing = fakeLlm([[{ type: 'finish', reason: { kind: 'error', failure: { message: 'quota', code: 'QUOTA' } } }]])
    await expect(runReview({ ...base, llm: failing, depth: 'quick' })).rejects.toThrow(/quota/)
    const slow = { stream: () => ({ async *[Symbol.asyncIterator]() { await new Promise((r) => setTimeout(r, 200)); yield* textChunks('x') } }) }
    await expect(runReview({ ...base, llm: slow, depth: 'quick', timeoutMs: 20 })).rejects.toMatchObject({ code: 'timeout' })
    const controller = new AbortController()
    const pending = runReview({ ...base, llm: slow, depth: 'quick', signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toBeInstanceOf(ReviewError)
  })
})

function host(options: { log?: Log; status?: string; cwd?: string; llm?: ReturnType<typeof fakeLlm> } = {}) {
  const log = options.log ?? new Log().start().user('把测试修好').tool('bash', { command: 'npm test' }, '2 failed', { error: true }).say('测试全部通过').end()
  const sent: Array<{ how: string; message: unknown }> = []
  const agent: AgentFace = {
    status: options.status ?? 'idle',
    steer: (message) => sent.push({ how: 'steer', message }),
    followup: (message) => sent.push({ how: 'followup', message }),
  }
  const session: SessionFace = { snapshotEvents: () => log.events, header: { cwd: options.cwd ?? root }, requestHeader: () => ({ config: { provider: 'work', model: 'w1' } }) }
  const llm = options.llm ?? fakeLlm([textChunks(GOOD_ANSWER)])
  const faces: HostFaces = {
    session: (id) => (id === 's1' ? session : undefined),
    sessionIds: () => ['s1'],
    agent: (id) => (id === 's1' ? agent : undefined),
    llm: () => llm as never,
    defaultRoute: () => ({ provider: 'harness', model: 'h1' }),
  }
  const store = createMemoryStore()
  return { log, sent, llm, store, agent, service: new ReviewService(faces, store, { ...DEFAULT_CONFIG, timeoutMs: 5000, deepTimeoutMs: 5000, loopSettleMs: 0 }) }
}

const PASS_ANSWER = JSON.stringify({ verdict: 'pass', summary: '都改好了', findings: [], checked: ['测试已通过'] })

describe('ReviewService', () => {
  it('runs a review, parses it and saves it; the reviewer reads the transcript and the workspace', async () => {
    const { service, llm, store } = host()
    const report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    expect(report).toMatchObject({ verdict: 'fail', turns: { from: 1, to: 1 }, provider: 'p1', model: 'm1', usedDepth: 'quick', trigger: 'manual' })
    expect(report.findings[0]!.title).toBe('测试没有通过')
    expect((await store.load('s1')).reports.map((item) => item.id)).toEqual([report.id])
    const prompt = JSON.stringify(llm.calls[0]!.messages)
    expect(prompt).toContain('把测试修好')
    expect(prompt).toContain('2 failed')
    expect(prompt).toContain('工作区现状')
  })

  it('picks the reviewer: the panel choice, DSH default, then the working model', async () => {
    const { service } = host()
    expect(await service.routeFor('s1')).toEqual({ provider: 'harness', model: 'h1', from: 'harness' })
    await service.setSettings('s1', { route })
    expect(await service.routeFor('s1')).toMatchObject({ provider: 'p1', from: 'settings' })
    await service.setSettings('s1', { route: null })
    expect(await service.routeFor('s1')).toMatchObject({ provider: 'harness', from: 'harness' })
  })

  it('one set of settings for every conversation: set in one, seen in another', async () => {
    const { service } = host()
    await service.setSettings('s1', { route: { ...route, effort: 'high' }, content: 'files', depth: 'deep', scope: { kind: 'all' }, loopRounds: 3, live: true })
    const other = await service.state('another-conversation')
    expect(other.settings).toEqual({ route: { ...route, effort: 'high' }, content: 'files', depth: 'deep', scope: { kind: 'all' }, loopRounds: 3, live: true })
    expect(other.effectiveRoute).toMatchObject({ provider: 'p1', from: 'settings' })
  })

  it('notes when the reviewer is the working model itself, and keeps the raw answer it cannot read', async () => {
    const llm = fakeLlm([textChunks('看起来不错')])
    const { service } = host({ llm })
    const report = await service.start({ session: 's1', scope: { kind: 'last' }, depth: 'quick', route: { provider: 'work', model: 'w1' } })
    expect(report.notes.join()).toContain('同一个模型')
    expect(report.raw).toBe('看起来不错')
    expect(report.verdict).toBe('doubt')
  })

  it('refuses what it cannot review: unknown conversations, empty ones, out-of-range turns', async () => {
    const { service } = host({ log: new Log() })
    await expect(service.start({ session: 'nope', scope: { kind: 'all' }, depth: 'quick', route })).rejects.toMatchObject({ code: 'not-loaded' })
    await expect(service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })).rejects.toMatchObject({ code: 'empty' })
    const other = host()
    await expect(other.service.start({ session: 's1', scope: { kind: 'range', from: 5, to: 9 }, depth: 'quick', route })).rejects.toMatchObject({ code: 'empty' })
  })

  it('one review per conversation at a time; the running one is visible in the state', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const llm = { ...fakeLlm([]), stream: () => ({ async *[Symbol.asyncIterator]() { await gate; yield* textChunks(GOOD_ANSWER) } }) }
    const { service } = host({ llm: llm as never })
    const first = service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    await new Promise((r) => setTimeout(r, 30))
    expect((await service.state('s1')).running?.trigger).toBe('manual')
    await expect(service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })).rejects.toMatchObject({ code: 'busy' })
    release()
    await first
    expect((await service.state('s1')).running).toBeUndefined()
  })

  it('a cancelled review saves nothing and is not shown as an error', async () => {
    const llm = { ...fakeLlm([]), stream: (options: { signal?: AbortSignal }) => ({ async *[Symbol.asyncIterator]() { await new Promise((r, reject) => options.signal?.addEventListener('abort', () => reject(new Error('aborted')))); yield* textChunks('') } }) }
    const { service, store } = host({ llm: llm as never })
    const pending = service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    await new Promise((r) => setTimeout(r, 30))
    expect(service.cancel('s1')).toBe(true)
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' })
    expect((await store.load('s1')).reports).toHaveLength(0)
    expect((await service.state('s1')).error).toBeUndefined()
  })

  it('sends to the working model only when asked: a follow-up when idle, steering while it runs', async () => {
    const idle = host()
    const report = await idle.service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    expect(idle.sent).toHaveLength(0)
    expect(await idle.service.send('s1', '请修正', report.id)).toEqual({ mode: 'followup' })
    expect(idle.sent[0]!.how).toBe('followup')
    expect(idle.sent[0]!.message).toMatchObject({ role: 'user', content: [{ type: 'text', text: '请修正' }], source: { kind: 'sider-task-reviewer' } })
    expect((await idle.store.load('s1')).reports[0]!.sentAt).toBeTypeOf('number')
    const busy = host({ status: 'running' })
    expect(await busy.service.send('s1', '停一下')).toEqual({ mode: 'steer' })
    await expect(busy.service.send('s1', '   ')).rejects.toMatchObject({ code: 'empty' })
  })

  it('dismisses and restores a finding, exports Markdown, deletes a report', async () => {
    const { service } = host()
    const report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    expect((await service.dismiss('s1', report.id, 0, true))?.findings[0]!.dismissed).toBe(true)
    expect((await service.dismiss('s1', report.id, 0, false))?.findings[0]).not.toHaveProperty('dismissed')
    const markdown = await service.exportMarkdown('s1', report.id)
    expect(markdown).toContain('# 任务审查报告 · 有问题')
    expect(markdown).toContain('测试没有通过')
    expect(await service.remove('s1', report.id)).toBe(true)
    expect(await service.exportMarkdown('s1', report.id)).toBeUndefined()
  })

  it('live review: only for conversations switched on, at the end of a turn, never sending anything', async () => {
    vi.useFakeTimers()
    const { service, llm, sent, store } = host()
    await service.onSessionEvent('s1', 'turn/end', 10)
    await vi.advanceTimersByTimeAsync(2000)
    expect(llm.calls).toHaveLength(0)
    await service.setSettings('s1', { live: true, route })
    await service.onSessionEvent('s1', 'step/end', 11)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(llm.calls).toHaveLength(0) // steps only count with the 'step' trigger
    await service.onSessionEvent('s1', 'turn/end', 12)
    await vi.advanceTimersByTimeAsync(2000)
    vi.useRealTimers()
    // Under a loaded test run the review can take a moment: wait for it rather than for a fixed time.
    for (let i = 0; i < 100 && (await store.load('s1')).reports.length === 0; i++) await new Promise((r) => setTimeout(r, 20))
    expect(llm.calls).toHaveLength(1)
    const saved = (await store.load('s1')).reports
    expect(saved[0]!.trigger).toBe('live')
    expect(JSON.stringify(llm.calls[0]!.system)).toContain('任务过程中的审查')
    expect(sent).toHaveLength(0)
  })

  it('live review leaves the sessions sub-agents run alone', async () => {
    vi.useFakeTimers()
    const log = new Log().start().user('子任务').say('做完了').end()
    const llm = fakeLlm([textChunks(GOOD_ANSWER)])
    const sub: SessionFace = { snapshotEvents: () => log.events, header: { cwd: root, origin: 'subagent', delegationDepth: 1 } }
    const service = new ReviewService({ session: () => sub, agent: () => undefined, llm: () => llm as never, defaultRoute: () => route }, createMemoryStore(), { ...DEFAULT_CONFIG, timeoutMs: 5000 })
    await service.setSettings('child', { live: true })
    await service.onSessionEvent('child', 'turn/end', 5)
    await vi.advanceTimersByTimeAsync(2000)
    vi.useRealTimers()
    await new Promise((r) => setTimeout(r, 30))
    expect(llm.calls).toHaveLength(0)
  })

  it('lists the loaded conversations', async () => {
    const { service } = host()
    expect(service.liveSessions()).toEqual([expect.objectContaining({ id: 's1', turns: 1, cwd: root })])
  })
})

describe('what a review looks at', () => {
  const written = () => join(root, 'src', 'a.ts')
  const logWithWrite = () => new Log().start().user('把 a.ts 改成导出 2').tool('write', { file_path: written(), content: 'export const a = 2' }, 'ok').say('改好了，测试通过').end()

  it('both (default): the conversation, the written files as they are now, and the workspace', async () => {
    const { service, llm } = host({ log: logWithWrite() })
    const report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    const prompt = JSON.stringify(llm.calls[0]!.messages)
    expect(report.content).toBe('both')
    expect(report.files).toEqual([written()])
    expect(prompt).toContain('改好了，测试通过')
    expect(prompt).toContain('执行者写出的文件')
    expect(prompt).toContain('export const a = 1')
    expect(String(llm.calls[0]!.system)).toContain('对话记录和执行者写出的文件都要看')
  })

  it('conversation only: no files, no workspace, and no tools even in deep mode', async () => {
    const { service, llm } = host({ log: logWithWrite() })
    const report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'deep', content: 'conversation', route })
    const prompt = JSON.stringify(llm.calls[0]!.messages)
    expect(prompt).toContain('改好了，测试通过')
    expect(prompt).not.toContain('执行者写出的文件')
    expect(prompt).not.toContain('工作区现状')
    expect(llm.calls[0]!.tools).toBeUndefined()
    expect(report.usedDepth).toBe('quick')
    expect(report.notes.join()).toContain('只看对话')
  })

  it("files only: the user's asks and the files, not the assistant's account of them", async () => {
    const { service, llm } = host({ log: logWithWrite() })
    await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', content: 'files', route })
    const prompt = JSON.stringify(llm.calls[0]!.messages)
    expect(prompt).toContain('把 a.ts 改成导出 2')
    expect(prompt).toContain('export const a = 1')
    expect(prompt).not.toContain('改好了，测试通过')
    expect(String(llm.calls[0]!.system)).toContain('只审查执行者写出的文件')
  })

  it('asks the model for the picked reasoning effort and reports it', async () => {
    const { service, llm } = host()
    const report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route: { ...route, effort: 'high' } })
    expect((llm.calls[0] as unknown as { reasoningEffort?: string }).reasoningEffort).toBe('high')
    expect(report.effort).toBe('high')
  })

  it('lists the efforts a model offers, and none when the host cannot say', async () => {
    const llm = { ...fakeLlm([textChunks(GOOD_ANSWER)]), resolveModelInfo: async () => ({ reasoning: { efforts: [{ id: 'low', name: '低' }, { id: 'max', name: '最高', description: '最慢' }], defaultEffort: 'low' } }) }
    const { service } = host({ llm: llm as never })
    expect(await service.efforts('p1', 'm1')).toEqual({ efforts: [{ id: 'low', name: '低' }, { id: 'max', name: '最高', description: '最慢' }], defaultEffort: 'low' })
    expect(await host().service.efforts('p1', 'm1')).toEqual({ efforts: [] })
  })
})

describe('review prompts', () => {
  it('edits and resets the built-in prompt, adds and deletes your own, and reviews use the picked one', async () => {
    const { service, llm } = host({ llm: fakeLlm([textChunks(GOOD_ANSWER), textChunks(GOOD_ANSWER)]) })
    expect((await service.prompts()).map((item) => item.name)).toEqual(['标准审查', '理论审查', '事实审查', '计划审查'])
    await service.savePrompt({ id: 'builtin-standard', name: '标准审查', text: '内置的，改过' })
    expect((await service.prompts())[0]).toMatchObject({ text: '内置的，改过', builtin: true, edited: true })
    const added = await service.savePrompt({ name: '只看安全', text: '只检查危险操作和密钥泄露' })
    expect(added.prompts.map((item) => item.name)).toEqual(['标准审查', '理论审查', '事实审查', '计划审查', '只看安全'])
    await service.setGlobal({ activePromptId: added.id })
    let report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    expect(report.promptName).toBe('只看安全')
    expect(String(llm.calls[0]!.system)).toContain('只检查危险操作和密钥泄露')
    expect(String(llm.calls[0]!.system)).toContain('"verdict":"pass|doubt|fail"') // the answer format is always added
    await service.setGlobal({ activePromptId: 'builtin-standard' })
    report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    expect(report.promptName).toBe('标准审查')
    expect(String(llm.calls[1]!.system)).toContain('内置的，改过')
    await service.deletePrompt(added.id)
    expect((await service.globalSettings()).activePromptId).toBe('builtin-standard')
    await service.deletePrompt('builtin-standard')
    expect((await service.prompts())[0]).not.toHaveProperty('edited')
    await expect(service.savePrompt({ name: ' ', text: 'x' })).rejects.toMatchObject({ code: 'bad-request' })
    await expect(service.setGlobal({ activePromptId: 'nope' })).rejects.toMatchObject({ code: 'bad-request' })
  })
})

describe('the built-in theory, facts and plan prompts', () => {
  it('each one is used as written, can be edited, and goes back to the original', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER)])
    const { service } = host({ llm })
    const all = await service.prompts()
    expect(all.find((item) => item.id === 'builtin-theory')!.text).toContain('logic（推导错误）')
    expect(all.find((item) => item.id === 'builtin-facts')!.text).toContain('你不能联网')
    expect(all.find((item) => item.id === 'builtin-plan')!.text).toContain('feasibility（可行性）')
    await service.setGlobal({ activePromptId: 'builtin-theory' })
    const report = await service.start({ session: 's1', scope: { kind: 'all' }, depth: 'quick', route })
    expect(report.promptName).toBe('理论审查')
    expect(String(llm.calls[0]!.system)).toContain('擅长数学和统计推导')
    expect(String(llm.calls[0]!.system)).toContain('logic|assumption|fact|source|detail|feasibility|alternative')
    await service.savePrompt({ id: 'builtin-plan', name: '计划审查', text: '只看时间安排' })
    expect((await service.prompts()).find((item) => item.id === 'builtin-plan')).toMatchObject({ text: '只看时间安排', edited: true, builtin: true })
    await service.deletePrompt('builtin-plan')
    expect((await service.prompts()).find((item) => item.id === 'builtin-plan')!.text).toContain('feasibility（可行性）')
    expect((await service.prompts()).map((item) => item.id)).toContain('builtin-plan')
  })
})

describe('continuous review', () => {
  const wait = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))

  it('reviews, sends the findings, waits for the fix, reviews the fix, and stops when it passes', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER), textChunks(PASS_ANSWER)])
    const { service, sent, log } = host({ llm })
    const started = await service.startLoop({ session: 's1', scope: { kind: 'last' }, content: 'conversation', depth: 'quick', route, maxRounds: 3 })
    expect(started).toMatchObject({ status: 'reviewing', round: 1, maxRounds: 3 })
    await wait()
    expect(sent).toHaveLength(1)
    expect(sent[0]!.how).toBe('followup')
    expect(JSON.stringify(sent[0]!.message)).toContain('连续审查 · 第 1/3 轮')
    expect((await service.state('s1')).loop).toMatchObject({ status: 'waiting', round: 1 })
    // An end of a turn from before the send does not count.
    await service.onSessionEvent('s1', 'turn/end', 0)
    await wait()
    expect(llm.calls).toHaveLength(1)
    // The working agent fixes it in a new turn.
    log.start().user('（审查意见）', 'sider-task-reviewer').tool('bash', { command: 'npm test' }, 'all passed').say('修好了').end()
    await service.onSessionEvent('s1', 'turn/end', log.events.at(-1)!.seq, 'success')
    await wait(60)
    expect(llm.calls).toHaveLength(2)
    const second = JSON.stringify(llm.calls[1]!.messages)
    expect(second).toContain('第 2–2 轮')
    expect(second).toContain('上一轮审查指出')
    expect(second).toContain('测试没有通过')
    const loop = (await service.state('s1')).loop!
    expect(loop.status).toBe('passed')
    expect(loop.rounds.map((round) => round.verdict)).toEqual(['fail', 'pass'])
    expect(sent).toHaveLength(1)
    const reports = (await service.state('s1')).reports
    expect(reports.map((item) => item.loop?.round)).toEqual([2, 1])
  })

  it('stops at the round limit', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER)])
    const { service, sent } = host({ llm })
    await service.startLoop({ session: 's1', scope: { kind: 'last' }, content: 'conversation', depth: 'quick', route, maxRounds: 1 })
    await wait()
    expect((await service.state('s1')).loop).toMatchObject({ status: 'limit', round: 1 })
    expect(sent).toHaveLength(0)
  })

  it('waits for a busy working agent before sending, and can be stopped', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER)])
    const { service, sent, agent } = host({ llm, status: 'running' })
    await service.startLoop({ session: 's1', scope: { kind: 'last' }, content: 'conversation', depth: 'quick', route, maxRounds: 3 })
    await wait()
    expect((await service.state('s1')).loop?.status).toBe('sending')
    expect(sent).toHaveLength(0)
    ;(agent as { status: string }).status = 'idle'
    await service.onSessionEvent('s1', 'turn/end', 999)
    await wait()
    expect(sent).toHaveLength(1)
    expect((await service.state('s1')).loop?.status).toBe('waiting')
    await expect(service.startLoop({ session: 's1', scope: { kind: 'last' }, content: 'both', depth: 'quick', maxRounds: 3 })).rejects.toMatchObject({ code: 'busy' })
    expect(service.stopLoop('s1')?.status).toBe('stopped')
  })

  it("stops when the working agent's turn was interrupted, and live review stays quiet while it runs", async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER)])
    const { service, log } = host({ llm })
    await service.setSettings('s1', { live: true })
    await service.startLoop({ session: 's1', scope: { kind: 'last' }, content: 'conversation', depth: 'quick', route, maxRounds: 3 })
    await wait()
    log.start().say('改到一半').end('cancelled')
    await service.onSessionEvent('s1', 'turn/end', log.events.at(-1)!.seq, 'cancelled')
    await wait(1000)
    const state = await service.state('s1')
    expect(state.loop?.status).toBe('stopped')
    expect(state.loop?.message).toContain('cancelled')
    expect(llm.calls).toHaveLength(1)
  })
})

describe('the file store', () => {
  it('keeps reports and settings across instances, newest first', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rv-store-'))
    const a = createFileStore(dir)
    await a.saveReview({ live: true, depth: 'deep', route, scope: { kind: 'all' }, content: 'files', loopRounds: 3 })
    await a.addReport({ id: 'r1', sessionId: 's/1' } as never)
    await a.addReport({ id: 'r2', sessionId: 's/1' } as never)
    await a.saveGlobal({ liveTrigger: 'step', activePromptId: 'p-x' })
    await a.savePrompts([{ id: 'p-x', name: '我的', text: '检查拼写' }])
    const b = createFileStore(dir)
    const file = await b.load('s/1')
    expect(file.reports.length).toBe(2)
    expect(await b.loadReview()).toEqual({ live: true, depth: 'deep', route, scope: { kind: 'all' }, content: 'files', loopRounds: 3 })
    expect(file.reports.map((item) => item.id)).toEqual(['r2', 'r1'])
    expect(await b.loadGlobal()).toEqual({ liveTrigger: 'step', activePromptId: 'p-x' })
    expect(await b.loadPrompts()).toEqual([{ id: 'p-x', name: '我的', text: '检查拼写' }])
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('routes', () => {
  let server: Server
  let base: string
  let ctx: ReturnType<typeof host>
  beforeAll(async () => {
    ctx = host()
    server = createServer((req, res) => void serveReviewer(ctx.service, req, res))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as { port: number }
    base = `http://127.0.0.1:${address.port}/sider-task-reviewer`
  })
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it('state, models, settings and a streamed review', async () => {
    const state = (await (await fetch(`${base}/state?session=s1`)).json()) as { ok: boolean; value: { turns: number; live: boolean } }
    expect(state).toMatchObject({ ok: true, value: { turns: 1, live: true } })
    const models = (await (await fetch(`${base}/models`)).json()) as { value: { groups: Array<{ id: string }> } }
    expect(models.value.groups.map((group) => group.id)).toEqual(['p1'])
    const settings = await (await fetch(`${base}/settings`, { method: 'POST', body: JSON.stringify({ session: 's1', depth: 'deep', live: true }) })).json()
    expect(settings).toMatchObject({ ok: true, value: { depth: 'deep', live: true } })
    await fetch(`${base}/settings`, { method: 'POST', body: JSON.stringify({ session: 's1', live: false }) })
    const stream = await (await fetch(`${base}/review`, { method: 'POST', body: JSON.stringify({ session: 's1', scope: { kind: 'last' }, depth: 'quick', route }) })).text()
    const events = stream.split('\n').filter((line) => line.startsWith('data: ')).map((line) => JSON.parse(line.slice(6)) as { type: string })
    expect(events.map((event) => event.type)).toContain('delta')
    expect(events.at(-1)!.type).toBe('done')
  })

  it('answers bad requests with a reason', async () => {
    expect((await fetch(`${base}/state`)).status).toBe(400)
    expect((await fetch(`${base}/settings`, { method: 'POST', body: '{bad' })).status).toBe(400)
    expect((await fetch(`${base}/nope`, { method: 'POST', body: '{}' })).status).toBe(404)
    const failed = await fetch(`${base}/send`, { method: 'POST', body: JSON.stringify({ session: 'other', text: 'x' }) })
    expect(failed.status).toBe(409)
    expect(((await failed.json()) as { error: string }).error).toContain('没有加载')
    const review = await (await fetch(`${base}/review`, { method: 'POST', body: JSON.stringify({ session: 'other', scope: { kind: 'last' } }) })).text()
    expect(review).toContain('"type":"error"')
  })
})
