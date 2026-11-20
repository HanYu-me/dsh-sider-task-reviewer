import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { serveReviewer } from '../src/routes'
import { DEFAULT_CONFIG, ReviewService, type AgentFace, type HostFaces, type SessionFace } from '../src/service'
import type { Report } from '../src/shared/protocol'
import { createMemoryStore } from '../src/store'
import { chatEntry, historyBlock, withChat, withReview, type StoredThread } from '../src/thread'
import { fakeLlm, GOOD_ANSWER, Log, textChunks } from './fixtures'

let root: string
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'rv-thread-'))
})
afterAll(() => rmSync(root, { recursive: true, force: true }))

const route = { provider: 'p1', model: 'm1' }

function report(id: string, extra: Partial<Report> = {}): Report {
  return {
    id,
    sessionId: 's1',
    createdAt: Date.now(),
    trigger: 'manual',
    scope: { kind: 'last' },
    content: 'both',
    promptName: '标准审查',
    turns: { from: 1, to: 1 },
    depth: 'quick',
    usedDepth: 'quick',
    provider: 'p1',
    model: 'm1',
    verdict: 'fail',
    summary: `结论 ${id}`,
    findings: [{ severity: 'high', category: 'claim', title: `问题 ${id}`, detail: '', evidence: '', suggestion: '' }],
    checked: [],
    tools: [],
    notes: [],
    elapsedMs: 1000,
    ...extra,
  }
}

describe('the reviewer thread', () => {
  it('keeps the material of the newest review only; older reviews send their conclusion', () => {
    let thread: StoredThread | undefined
    thread = withReview(thread, report('r1'), 'MATERIAL ONE\n\n请审查上面的内容，按要求输出 JSON。', ['/w'])
    thread = withReview(thread, report('r2'), 'MATERIAL TWO\n\n请审查上面的内容，按要求输出 JSON。', ['/w'])
    expect(thread.entries.filter((entry) => entry.kind === 'review' && entry.material !== undefined)).toHaveLength(1)
    const forReview = historyBlock(thread, [report('r1'), report('r2')], { keepLatestMaterial: false, budget: 10_000 })
    expect(forReview.text).not.toContain('MATERIAL')
    expect(forReview.text).toContain('之前的一次审查')
    expect(forReview.text).toContain('问题 r1')
    expect(forReview).toMatchObject({ reviews: 2, chats: 0, dropped: 0 })
    const forChat = historyBlock(thread, [], { keepLatestMaterial: true, budget: 10_000 }).text
    expect(forChat).toContain('最近一次审查')
    expect(forChat).toContain('MATERIAL TWO')
    expect(forChat).not.toContain('MATERIAL ONE')
    // The quoted request does not ask for JSON again.
    expect(forChat).not.toContain('按要求输出 JSON')
  })

  it('tells what the user did with the findings, quotes the discussion, and drops the oldest past the budget', () => {
    let thread: StoredThread | undefined
    thread = withReview(thread, report('r1'), 'M1', [])
    thread = withChat(thread, chatEntry('user', '第 1 条是误报吗？'), chatEntry('reviewer', '不是误报。', { provider: 'p1', model: 'm1' }))
    thread = withReview(thread, report('r2'), 'M2', [])
    const reports = [report('r1', { findings: [{ severity: 'high', category: 'claim', title: 'x', detail: '', evidence: '', suggestion: '', dismissed: true }], sentAt: 1 }), report('r2')]
    const all = historyBlock(thread, reports, { keepLatestMaterial: false, budget: 100_000 })
    expect(all).toMatchObject({ reviews: 2, chats: 1, dropped: 0 })
    expect(all.text).toContain('用户选择忽略第 1 条问题')
    expect(all.text).toContain('已经发给了主对话')
    expect(all.text).toContain('用户：第 1 条是误报吗？\n你：不是误报。')
    expect(all.text.indexOf('问题 r1')).toBeLessThan(all.text.indexOf('第 1 条是误报吗')) // oldest first
    const tight = historyBlock(thread, reports, { keepLatestMaterial: false, budget: 400 })
    expect(tight.dropped).toBeGreaterThan(0)
    expect(tight.text).toContain('已省略')
    expect(tight.text).toContain('问题 r2')
    expect(historyBlock(undefined, [], { keepLatestMaterial: true, budget: 100 }).text).toBe('')
  })

  it('skips a user message that never got a reply', () => {
    const thread: StoredThread = { startedAt: 0, entries: [chatEntry('user', '没有回答的问题'), chatEntry('user', '问题'), chatEntry('reviewer', '回答')] }
    const block = historyBlock(thread, [], { keepLatestMaterial: true, budget: 10_000 })
    expect(block.text).not.toContain('没有回答的问题')
    expect(block.text).toContain('用户：问题\n你：回答')
  })
})

function host(llm: ReturnType<typeof fakeLlm>) {
  const log = new Log().start().user('把测试修好').tool('bash', { command: 'npm test' }, '2 failed', { error: true }).say('测试全部通过').end()
  const sent: unknown[] = []
  const agent: AgentFace = { status: 'idle', steer: (message) => sent.push(message), followup: (message) => sent.push(message) }
  const session: SessionFace = { snapshotEvents: () => log.events, header: { cwd: root }, requestHeader: () => ({ config: { provider: 'work', model: 'w1' } }) }
  const faces: HostFaces = {
    session: (id) => (id === 's1' ? session : undefined),
    sessionIds: () => ['s1'],
    agent: (id) => (id === 's1' ? agent : undefined),
    llm: () => llm as never,
    defaultRoute: () => ({ provider: 'harness', model: 'h1' }),
  }
  const store = createMemoryStore()
  return { log, store, service: new ReviewService(faces, store, { ...DEFAULT_CONFIG, timeoutMs: 5000, deepTimeoutMs: 5000, loopSettleMs: 0 }) }
}

describe('reviews of one conversation remember each other', () => {
  it('a second review is sent the first one (its conclusion) and the discussion, and is told to stay consistent', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER), textChunks('第 1 条确实成立：测试输出是 2 failed。'), textChunks(GOOD_ANSWER)])
    const { service, store } = host(llm)
    const first = await service.start({ session: 's1', scope: { kind: 'last' }, depth: 'quick', content: 'conversation', route })
    expect(llm.calls[0]!.messages).toHaveLength(1)
    expect(String(llm.calls[0]!.system)).not.toContain('你在持续审查这个对话')

    const reply = await service.chat('s1', '第 1 条是不是误报？', route)
    expect(reply).toMatchObject({ kind: 'chat', role: 'reviewer', text: '第 1 条确实成立：测试输出是 2 failed。' })
    // The discussion sees the review with its material and the reviewer's answer, then the question, all in one message.
    const chatCall = llm.calls[1]!
    expect(chatCall.messages).toHaveLength(1)
    const asked = JSON.stringify(chatCall.messages[0])
    expect(asked).toContain('把测试修好')
    expect(asked).toContain('测试没有通过')
    expect(asked.indexOf('测试没有通过')).toBeLessThan(asked.indexOf('# 用户现在对你说'))
    expect(asked).toContain('第 1 条是不是误报？')
    expect(String(chatCall.system)).toContain('REVIEW_POLICY')
    expect(String(chatCall.system)).toContain('不要输出 JSON')
    expect(chatCall.sessionId).toBeUndefined()

    await service.start({ session: 's1', scope: { kind: 'last' }, depth: 'quick', content: 'conversation', route })
    const second = llm.calls[2]!
    expect(String(second.system)).toContain('你在持续审查这个对话')
    expect(second.messages).toHaveLength(1)
    const sent = JSON.stringify(second.messages[0])
    const record = sent.slice(0, sent.indexOf('# 这次的审查'))
    expect(record).toContain('之前的一次审查')
    expect(record).toContain('测试没有通过')
    expect(record).toContain('第 1 条是不是误报？')
    expect(record).not.toContain('把测试修好') // the first review's material is not sent again
    expect(sent.slice(sent.indexOf('# 这次的审查'))).toContain('把测试修好') // this review's own material

    const state = await service.state('s1')
    expect(state.thread.map((entry) => (entry.kind === 'review' ? `review:${entry.reportId === first.id ? 'first' : 'second'}` : `chat:${entry.role}`))).toEqual(['review:first', 'chat:user', 'chat:reviewer', 'review:second'])
    expect(JSON.stringify(state.thread)).not.toContain('"material"')
    expect((await store.load('s1')).thread!.entries.filter((entry) => entry.kind === 'review' && entry.material !== undefined)).toHaveLength(1)
  })

  it('keeps nothing of a discussion message that got no answer, and starts afresh on reset', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER), new Error('upstream down'), textChunks(GOOD_ANSWER)])
    const { service } = host(llm)
    await service.start({ session: 's1', scope: { kind: 'last' }, depth: 'quick', content: 'conversation', route })
    await expect(service.chat('s1', '为什么？', route)).rejects.toThrow()
    expect((await service.state('s1')).thread).toHaveLength(1)
    await service.resetThread('s1')
    expect((await service.state('s1')).thread).toEqual([])
    expect((await service.state('s1')).reports).toHaveLength(1)
    await service.start({ session: 's1', scope: { kind: 'last' }, depth: 'quick', content: 'conversation', route })
    expect(JSON.stringify(llm.calls[2]!.messages)).not.toContain('之前的一次审查')
  })

  it('discussing a report the reviewer does not remember adds its conclusion first', async () => {
    const llm = fakeLlm([textChunks(GOOD_ANSWER), textChunks('好的。')])
    const { service } = host(llm)
    await service.start({ session: 's1', scope: { kind: 'last' }, depth: 'quick', content: 'conversation', route })
    await service.resetThread('s1')
    await service.chat('s1', '解释一下', route)
    const call = JSON.stringify(llm.calls[1]!.messages)
    expect(call).toContain('之前的一次审查')
    expect(call).toContain('测试没有通过')
    expect((await service.state('s1')).thread.map((entry) => entry.kind)).toEqual(['review', 'chat', 'chat'])
  })

  it('serves the discussion over HTTP as server-sent events', async () => {
    const llm = fakeLlm([textChunks('你好，我是审查模型。')])
    const { service } = host(llm)
    const server: Server = createServer((req, res) => void serveReviewer(service, req, res))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port
    try {
      const response = await fetch(`http://127.0.0.1:${port}/sider-task-reviewer/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: 's1', text: '在吗', route }) })
      const body = await response.text()
      expect(body).toContain('"type":"delta"')
      expect(body).toContain('"type":"done"')
      const empty = await fetch(`http://127.0.0.1:${port}/sider-task-reviewer/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: 's1', text: '  ' }) })
      expect(await empty.text()).toContain('"type":"error"')
      const reset = await fetch(`http://127.0.0.1:${port}/sider-task-reviewer/thread/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: 's1' }) })
      expect(await reset.json()).toEqual({ ok: true, value: true })
    } finally {
      server.close()
    }
  })
})
