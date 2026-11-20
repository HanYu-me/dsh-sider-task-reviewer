/**
 * Turn a conversation's session log into what the reviewer reads: turns
 * numbered the way people count them, each with the user's words, the
 * assistant's text and every tool call with its (shortened) result, fitted
 * into a character budget by squeezing older turns first.
 *
 * Works on the raw `Session.snapshotEvents()` records (typed loosely here: the
 * log is merge-extensible and a reviewer must not refuse a conversation over
 * an event type it does not know).
 * @module dsh-sider-task-reviewer/transcript
 */
import type { ReviewScope } from './shared/protocol'

/** The fields of a session event this module reads. */
export interface LogEvent {
  type: string
  seq: number
  time: number
  data: unknown
}

export interface ToolItem {
  kind: 'tool'
  step: number
  callId: string
  name: string
  args: string
  result?: string
  isError?: boolean
}

export type TurnItem =
  | { kind: 'user'; text: string; context?: string }
  | { kind: 'assistant'; step: number; text: string; interrupted?: boolean }
  | ToolItem

export interface TurnRecord {
  /** 1-based, in the order turns happened, counting only turns with content. */
  index: number
  /** DSH's own turn number. */
  turn: number
  startSeq: number
  startedAt: number
  endedAt?: number
  /** Why it ended, when it did not end normally ("cancelled", "error"…). */
  endReason?: string
  items: TurnItem[]
}

type Json = Record<string, unknown>

function obj(value: unknown): Json | undefined {
  return typeof value === 'object' && value !== null ? (value as Json) : undefined
}

/** The readable text of message content blocks. */
export function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const raw of content) {
    const block = obj(raw)
    if (block === undefined) continue
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    else if (block.type === 'image') parts.push('[图片]')
    else if (block.type === 'file') {
      const attachment = obj(block.attachment)
      const name = typeof attachment?.name === 'string' ? attachment.name : '附件'
      parts.push(`[文件 ${name}]`)
    }
  }
  return parts.join('\n')
}

function endReasonOf(data: Json | undefined): string | undefined {
  const reason = obj(data?.reason)
  const kind = typeof reason?.kind === 'string' ? reason.kind : undefined
  if (kind === undefined || kind === 'success' || kind === 'completed' || kind === 'stop' || kind === 'done') return undefined
  return kind
}

/**
 * Group the log into turns.
 * @param events - the session log, in order.
 * @returns the turns that carry anything (a user message, assistant text or a tool call).
 */
export function turnsOf(events: readonly LogEvent[]): TurnRecord[] {
  const turns: TurnRecord[] = []
  let open: TurnRecord | undefined
  const calls = new Map<string, ToolItem>()
  const ensure = (turn: number, event: LogEvent): TurnRecord => {
    if (open !== undefined && open.turn === turn) return open
    open = { index: 0, turn, startSeq: event.seq, startedAt: event.time, items: [] }
    turns.push(open)
    return open
  }
  for (const event of events) {
    const data = obj(event.data)
    switch (event.type) {
      case 'turn/start': {
        const turn = typeof data?.turn === 'number' ? data.turn : (open?.turn ?? 0) + 1
        open = { index: 0, turn, startSeq: event.seq, startedAt: event.time, items: [] }
        turns.push(open)
        break
      }
      case 'turn/end': {
        const turn = typeof data?.turn === 'number' ? data.turn : open?.turn
        const target = turns.findLast((item) => item.turn === turn) ?? open
        if (target !== undefined) {
          target.endedAt = event.time
          const reason = endReasonOf(data)
          if (reason !== undefined) target.endReason = reason
        }
        break
      }
      case 'user/message': {
        // The message itself is the payload; it belongs to the open turn.
        const target = open ?? ensure(0, event)
        const source = obj(data?.source)
        const kind = typeof source?.kind === 'string' ? source.kind : 'user'
        const text = textOf(data?.content)
        if (text.trim() === '') break
        target.items.push(kind === 'user' ? { kind: 'user', text } : { kind: 'user', text, context: kind })
        break
      }
      case 'assistant/message': {
        const turn = typeof data?.turn === 'number' ? data.turn : (open?.turn ?? 0)
        const step = typeof data?.step === 'number' ? data.step : 0
        const message = obj(data?.message)
        const text = textOf(message?.content).trim()
        if (text === '') break
        ensure(turn, event).items.push({ kind: 'assistant', step, text, ...(data?.interrupted === true ? { interrupted: true } : {}) })
        break
      }
      case 'tool/call': {
        const turn = typeof data?.turn === 'number' ? data.turn : (open?.turn ?? 0)
        const item: ToolItem = {
          kind: 'tool',
          step: typeof data?.step === 'number' ? data.step : 0,
          callId: String(data?.callId ?? ''),
          name: typeof data?.name === 'string' ? data.name : '?',
          args: typeof data?.arguments === 'string' ? data.arguments : JSON.stringify(data?.arguments ?? ''),
        }
        ensure(turn, event).items.push(item)
        calls.set(item.callId, item)
        break
      }
      case 'tool/result': {
        const message = obj(data?.message)
        const callId = String(message?.toolCallId ?? '')
        const item = calls.get(callId)
        if (item === undefined) break
        item.result = textOf(message?.content)
        const error = obj(data?.error)
        if (message?.isError === true || error !== undefined) item.isError = true
        if (error !== undefined && typeof error.reason === 'string' && item.result.trim() === '') item.result = error.reason
        break
      }
      default:
        break
    }
  }
  const kept = turns.filter((turn) => turn.items.length > 0)
  kept.forEach((turn, position) => {
    turn.index = position + 1
  })
  return kept
}

/**
 * The turns a scope covers.
 * @returns the selected turns, and the turns before them (background).
 */
export function selectTurns(turns: readonly TurnRecord[], scope: ReviewScope): { selected: TurnRecord[]; before: TurnRecord[] } {
  if (turns.length === 0) return { selected: [], before: [] }
  if (scope.kind === 'all') return { selected: [...turns], before: [] }
  if (scope.kind === 'last') return { selected: [turns[turns.length - 1]!], before: turns.slice(0, -1) }
  const from = Math.max(1, Math.min(scope.from, scope.to))
  const to = Math.min(turns.length, Math.max(scope.from, scope.to))
  return { selected: turns.filter((turn) => turn.index >= from && turn.index <= to), before: turns.filter((turn) => turn.index < from) }
}

/** Keep the head and the tail of a long text, saying how much was cut. */
export function clip(text: string, limit: number): string {
  if (text.length <= limit) return text
  if (limit < 40) return text.slice(0, limit) + '…'
  const head = Math.ceil(limit * 0.6)
  const tail = limit - head
  return `${text.slice(0, head)}\n…（省略 ${text.length - head - tail} 字）…\n${text.slice(text.length - tail)}`
}

/** How much of each part a turn keeps at each squeeze level. */
const LEVELS = [
  { user: 6000, assistant: 6000, args: 1200, result: 2500 },
  { user: 3000, assistant: 2000, args: 500, result: 800 },
  { user: 1200, assistant: 600, args: 200, result: 200 },
  { user: 600, assistant: 200, args: 100, result: 0 },
] as const

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Render one turn for the reviewer. */
export function renderTurn(turn: TurnRecord, level = 0): string {
  const limits = LEVELS[Math.min(level, LEVELS.length - 1)]!
  const lines: string[] = [`## 第 ${turn.index} 轮${turn.endReason !== undefined ? `（结束原因：${turn.endReason}）` : turn.endedAt === undefined ? '（进行中）' : ''}`]
  const lastAssistant = turn.items.findLastIndex((item) => item.kind === 'assistant')
  turn.items.forEach((item, position) => {
    if (item.kind === 'user') {
      if (item.context !== undefined) lines.push(`[注入的上下文 · ${item.context}] ${clip(oneLine(item.text), Math.min(400, limits.user))}`)
      else lines.push(`[用户] ${clip(item.text, limits.user)}`)
    } else if (item.kind === 'assistant') {
      // The turn's last words are where claims of being done live: keep them longest.
      const limit = position === lastAssistant ? Math.max(limits.assistant, 1500) : limits.assistant
      lines.push(`[助手 · 第 ${item.step} 步${item.interrupted === true ? ' · 被打断' : ''}] ${clip(item.text, limit)}`)
    } else {
      const status = item.result === undefined ? '（无结果）' : item.isError === true ? '（失败）' : ''
      const head = `[工具 · 第 ${item.step} 步] ${item.name} ${clip(oneLine(item.args), limits.args)}${status}`
      if (limits.result === 0 || item.result === undefined) lines.push(head)
      else lines.push(`${head}\n  → ${clip(item.result, limits.result).replace(/\n/g, '\n    ')}`)
    }
  })
  return lines.join('\n')
}

/** The user's earlier requests, as background for a review of later turns. */
export function renderBackground(before: readonly TurnRecord[], limit = 4000): string {
  const asks: string[] = []
  for (const turn of before) {
    for (const item of turn.items) {
      if (item.kind === 'user' && item.context === undefined) asks.push(`第 ${turn.index} 轮：${clip(oneLine(item.text), 500)}`)
    }
  }
  if (asks.length === 0) return ''
  // The first request usually defines the task; then the most recent ones.
  const picked = asks.length <= 8 ? asks : [asks[0]!, '…', ...asks.slice(-6)]
  return clip(picked.join('\n'), limit)
}

export interface FittedTranscript {
  text: string
  /** Turns shown only as a squeezed summary or dropped. */
  squeezed: number
  dropped: number
}

/**
 * Render the selected turns within `budget` characters: older turns are
 * squeezed first, level by level; if that is not enough the oldest go.
 */
export function fitTurns(turns: readonly TurnRecord[], budget: number): FittedTranscript {
  const levels = turns.map(() => 0)
  const render = (): string[] => turns.map((turn, position) => renderTurn(turn, levels[position]))
  let parts = render()
  const total = (): number => parts.reduce((sum, part) => sum + part.length + 2, 0)
  // Squeeze from the oldest turn, one level at a time, never the newest before the rest.
  for (let level = 1; level < LEVELS.length && total() > budget; level++) {
    for (let position = 0; position < turns.length && total() > budget; position++) {
      if (position === turns.length - 1 && turns.length > 1 && level > 1) break
      levels[position] = level
      parts[position] = renderTurn(turns[position]!, level)
    }
  }
  let dropped = 0
  while (total() > budget && parts.length - dropped > 1) {
    parts[dropped] = ''
    dropped += 1
  }
  if (dropped > 0) parts[0] = `（较早的 ${dropped} 轮超出篇幅，未包含）`
  parts = parts.filter((part) => part !== '')
  let text = parts.join('\n\n')
  if (text.length > budget) text = clip(text, budget)
  return { text, squeezed: levels.filter((level) => level > 0).length, dropped }
}
