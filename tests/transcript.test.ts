import { describe, expect, it } from 'vitest'
import { addCounts, redact, redactionNote } from '../src/redact'
import { impliedVerdict, parseReview } from '../src/parse'
import { CATEGORY_LABELS } from '../src/shared/protocol'
import { clip, fitTurns, renderBackground, renderTurn, selectTurns, turnsOf } from '../src/transcript'
import { GOOD_ANSWER, Log } from './fixtures'

describe('turnsOf', () => {
  it('groups the log into numbered turns with the user, the assistant and each tool call with its result', () => {
    const log = new Log()
      .start().user('把测试修好').tool('bash', { command: 'npm test' }, '2 failed', { error: true }).say('测试全部通过了').end()
      .start().user('再加一个功能').say('好的', 1).tool('edit', { path: 'a.ts' }, 'ok', { step: 2 }).end('cancelled')
    const turns = turnsOf(log.events)
    expect(turns.map((turn) => turn.index)).toEqual([1, 2])
    expect(turns[0]!.items.map((item) => item.kind)).toEqual(['user', 'tool', 'assistant'])
    const tool = turns[0]!.items[1]!
    expect(tool).toMatchObject({ kind: 'tool', name: 'bash', result: '2 failed', isError: true })
    expect(turns[1]!.endReason).toBe('cancelled')
    expect(turns[0]!.endReason).toBeUndefined()
  })

  it('marks injected context apart from what the user typed, and skips empty turns', () => {
    const log = new Log().start().end().start().user('cron 通知', 'cron').user('真正的请求').say('嗯').end()
    const turns = turnsOf(log.events)
    expect(turns).toHaveLength(1)
    expect(turns[0]!.index).toBe(1)
    expect(turns[0]!.items[0]).toMatchObject({ kind: 'user', context: 'cron' })
    expect(turns[0]!.items[1]).toMatchObject({ kind: 'user', text: '真正的请求' })
    expect(turns[0]!.items[1]).not.toHaveProperty('context')
  })

  it('keeps going over event types it does not know', () => {
    const log = new Log().start().user('hi')
    log.events.push({ type: 'something/new', seq: 99, time: 1, data: { odd: true } })
    log.say('hello').end()
    expect(turnsOf(log.events)[0]!.items).toHaveLength(2)
  })
})

describe('selectTurns', () => {
  const turns = turnsOf(new Log().start().user('a').end().start().user('b').end().start().user('c').end().events)
  it('last, all and a clamped range', () => {
    expect(selectTurns(turns, { kind: 'last' }).selected.map((t) => t.index)).toEqual([3])
    expect(selectTurns(turns, { kind: 'last' }).before.map((t) => t.index)).toEqual([1, 2])
    expect(selectTurns(turns, { kind: 'all' }).selected).toHaveLength(3)
    expect(selectTurns(turns, { kind: 'range', from: 2, to: 9 }).selected.map((t) => t.index)).toEqual([2, 3])
    expect(selectTurns(turns, { kind: 'range', from: 3, to: 2 }).selected.map((t) => t.index)).toEqual([2, 3])
  })
})

describe('rendering within a budget', () => {
  it('clip keeps the head and the tail and says how much was cut', () => {
    const text = 'a'.repeat(500) + 'END'
    const out = clip(text, 100)
    expect(out.length).toBeLessThan(140)
    expect(out.endsWith('END')).toBe(true)
    expect(out).toContain('省略')
  })

  it('squeezes older turns first and keeps the last turn whole', () => {
    const log = new Log()
    for (let i = 0; i < 6; i++) log.start().user(`请求 ${i} ` + 'x'.repeat(2000)).tool('bash', { command: 'ls' }, 'y'.repeat(3000)).say(`完成 ${i} ` + 'z'.repeat(1500)).end()
    const turns = turnsOf(log.events)
    const full = turns.map((turn) => renderTurn(turn)).join('\n\n').length
    const fitted = fitTurns(turns, Math.floor(full / 2))
    expect(fitted.text.length).toBeLessThanOrEqual(Math.floor(full / 2))
    expect(fitted.squeezed).toBeGreaterThan(0)
    expect(fitted.text).toContain('完成 5 ' + 'z'.repeat(1400))
  })

  it('drops the oldest turns when squeezing is not enough', () => {
    const log = new Log()
    for (let i = 0; i < 8; i++) log.start().user('u'.repeat(4000)).end()
    const fitted = fitTurns(turnsOf(log.events), 3000)
    expect(fitted.dropped).toBeGreaterThan(0)
    expect(fitted.text).toContain('未包含')
  })

  it('the background lists what the user asked before', () => {
    const turns = turnsOf(new Log().start().user('先做 A').end().start().user('cron', 'cron').user('再做 B').end().events)
    const text = renderBackground(turns)
    expect(text).toContain('第 1 轮：先做 A')
    expect(text).toContain('第 2 轮：再做 B')
    expect(text).not.toContain('cron')
  })
})

describe('redact', () => {
  it('hides common secrets and counts them', () => {
    const out = redact('key sk-abcdefghijklmnopqrstuv token=hunter2hunter2 ghp_abcdefghijklmnopqrstuvwxyz0123 Authorization: Bearer abcdefghijklmnopqrstuvwxyz')
    expect(out.text).not.toContain('sk-abcdefghijklmnopqrstuv')
    expect(out.text).not.toContain('hunter2hunter2')
    expect(out.text).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123')
    expect(out.text).toContain('Bearer [已隐藏的Bearer token]')
    expect(out.text).toContain('token=[已隐藏的密码/密钥]')
    expect(Object.values(out.counts).reduce((a, b) => a + b, 0)).toBe(4)
    expect(redactionNote(out.counts)).toContain('发送前隐藏了')
  })

  it('leaves ordinary text alone', () => {
    const out = redact('npm test 输出 2 failed；token 数量 1200')
    expect(out.text).toBe('npm test 输出 2 failed；token 数量 1200')
    expect(redactionNote(out.counts)).toBeUndefined()
    expect(addCounts({ a: 1 }, { a: 2, b: 1 })).toEqual({ a: 3, b: 1 })
  })

  it('hides a private key block', () => {
    const out = redact('-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----')
    expect(out.text).toBe('[已隐藏的私钥]')
  })
})

describe('parseReview', () => {
  it('reads plain JSON, fenced JSON and JSON after prose', () => {
    for (const text of [GOOD_ANSWER, '```json\n' + GOOD_ANSWER + '\n```', '好的，结论如下：\n' + GOOD_ANSWER + '\n以上。']) {
      const parsed = parseReview(text)
      expect(parsed?.verdict).toBe('fail')
      expect(parsed?.findings[0]).toMatchObject({ severity: 'high', category: 'claim', title: '测试没有通过' })
      expect(parsed?.checked).toEqual(['改动范围与需求一致'])
    }
  })

  it('tolerates braces inside strings, aliases and missing fields', () => {
    const parsed = parseReview('{"verdict":"Warning","findings":[{"severity":"critical","category":"nope","title":"写了 {x}"},{"detail":"只有 detail"},{}]}')
    expect(parsed?.verdict).toBe('doubt')
    expect(parsed?.findings).toHaveLength(2)
    expect(parsed?.findings[0]).toMatchObject({ severity: 'high', category: 'other', title: '写了 {x}' })
    expect(parsed?.findings[1]!.title).toBe('只有 detail')
  })

  it('reads the categories of the theory, facts and plan prompts', () => {
    const parsed = parseReview('{"verdict":"fail","findings":[{"severity":"high","category":"logic","title":"第 3 步方差少了因子 n"},{"severity":"medium","category":"source","title":"引用对不上"},{"severity":"low","category":"feasibility","title":"算力不够"},{"severity":"low","category":"alternative","title":"有现成工具"}]}')
    expect(parsed?.findings.map((item) => item.category)).toEqual(['logic', 'source', 'feasibility', 'alternative'])
    expect(CATEGORY_LABELS.logic).toBe('推导错误')
    expect(CATEGORY_LABELS.detail).toBe('不够准确/详细')
  })

  it('derives the verdict from the findings when the model gave none', () => {
    expect(parseReview('{"findings":[{"severity":"medium","title":"t"}]}')?.verdict).toBe('doubt')
    expect(parseReview('{"summary":"都好","findings":[]}')?.verdict).toBe('pass')
    expect(impliedVerdict([{ severity: 'high', category: 'risk', title: 'x', detail: '', evidence: '', suggestion: '' }])).toBe('fail')
  })

  it('salvages the complete part of an answer cut off by the length limit', () => {
    const cut = '{"verdict":"doubt","summary":"大体可以","findings":[{"severity":"medium","category":"claim","title":"一","detail":"d"},{"severity":"low","category":"risk","title":"二","detail":"被截'
    const parsed = parseReview(cut)
    expect(parsed?.partial).toBe(true)
    expect(parsed?.verdict).toBe('doubt')
    expect(parsed?.summary).toBe('大体可以')
    // The second finding keeps its complete fields; its cut-off detail is left out.
    expect(parsed?.findings.map((item) => item.title)).toEqual(['一', '二'])
    expect(parsed?.findings[1]!.detail).toBe('')
    const inChecked = parseReview('{"verdict":"pass","summary":"好","findings":[],"checked":["甲","乙","丙没写')
    expect(inChecked?.checked).toEqual(['甲', '乙'])
  })

  it('gives up on text without a review object', () => {
    expect(parseReview('我觉得没问题')).toBeUndefined()
    expect(parseReview('{"unrelated": 1}')).toBeUndefined()
    expect(parseReview('{"verdict": "pass", "summary": "被截断')).toBeUndefined()
    expect(parseReview('{"verdict": "pass", "summary": "完整", "findings": [')?.partial).toBe(true)
  })
})
