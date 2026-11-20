/**
 * The reviewer's own conversation about one working conversation.
 *
 * Every review of a conversation and every message of the discussion about
 * them is kept here, and later calls send it back as a record, so the
 * reviewer remembers what it said before. It stays in the plugin: no DSH
 * session is opened (that would run an agent with tools), and the record goes
 * into the request itself as text, which every provider reads the same way.
 *
 * Size stays bounded: only the newest review keeps the material it was given
 * (the conversation and files); older reviews keep the reviewer's conclusion,
 * and the history is cut from the oldest end to a character budget.
 * @module dsh-sider-task-reviewer/thread
 */
import { randomUUID } from 'node:crypto'
import { CONTENT_LABELS, scopeLabel, type Report, type ReviewToolUse, type ThreadEntry } from './shared/protocol'

/** Most entries kept (oldest go first). */
export const MAX_THREAD_ENTRIES = 300

/** A review in the stored thread. */
export interface StoredReview {
  kind: 'review'
  id: string
  at: number
  reportId: string
  label: string
  provider: string
  model: string
  /** The reviewer's conclusion as it answered (compact JSON). */
  answer: string
  /** What the reviewer was given: kept on the newest review only. */
  material?: string
  /** Where that review could look (the discussion's read-only tools look there too). */
  roots?: string[]
}

export interface StoredChat {
  kind: 'chat'
  id: string
  at: number
  role: 'user' | 'reviewer'
  text: string
  provider?: string
  model?: string
  tools?: ReviewToolUse[]
  notes?: string[]
}

export type StoredEntry = StoredReview | StoredChat

export interface StoredThread {
  startedAt: number
  entries: StoredEntry[]
}

/** Keep what a stored file may hold; drop the rest. */
export function sanitizeThread(value: unknown): StoredThread | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Partial<StoredThread>
  if (!Array.isArray(record.entries)) return undefined
  const entries = record.entries.filter((item): item is StoredEntry => {
    if (typeof item !== 'object' || item === null || typeof item.id !== 'string' || typeof item.at !== 'number') return false
    if (item.kind === 'review') return typeof item.reportId === 'string' && typeof item.answer === 'string'
    return item.kind === 'chat' && (item.role === 'user' || item.role === 'reviewer') && typeof item.text === 'string'
  })
  return { startedAt: typeof record.startedAt === 'number' ? record.startedAt : Date.now(), entries: entries.slice(-MAX_THREAD_ENTRIES) }
}

/** What the panel sees: no material, no stored answers. */
export function threadView(thread: StoredThread | undefined): ThreadEntry[] {
  if (thread === undefined) return []
  return thread.entries.map((entry): ThreadEntry => {
    if (entry.kind === 'review') return { kind: 'review', id: entry.id, at: entry.at, reportId: entry.reportId, label: entry.label, provider: entry.provider, model: entry.model }
    return {
      kind: 'chat',
      id: entry.id,
      at: entry.at,
      role: entry.role,
      text: entry.text,
      ...(entry.provider !== undefined ? { provider: entry.provider } : {}),
      ...(entry.model !== undefined ? { model: entry.model } : {}),
      ...(entry.tools !== undefined && entry.tools.length > 0 ? { tools: entry.tools } : {}),
      ...(entry.notes !== undefined && entry.notes.length > 0 ? { notes: entry.notes } : {}),
    }
  })
}

/** The reviewer's conclusion, compact. */
export function answerOf(report: Report): string {
  return JSON.stringify({
    verdict: report.verdict,
    summary: report.summary,
    findings: report.findings.map((item) => ({ severity: item.severity, category: item.category, title: item.title, detail: item.detail, evidence: item.evidence, suggestion: item.suggestion })),
    checked: report.checked,
  })
}

/** What a review looked at, for people and for the history. */
export function reviewLabel(report: Report): string {
  const range = report.turns.from === report.turns.to ? `第 ${report.turns.from} 轮` : `第 ${report.turns.from}–${report.turns.to} 轮`
  const parts = [range, CONTENT_LABELS[report.content ?? 'both'], report.usedDepth === 'deep' ? '深入' : '快速', report.promptName]
  if (report.trigger === 'live') parts.push('实时审查')
  if (report.loop !== undefined) parts.push(`连续审查第 ${report.loop.round}/${report.loop.max} 轮`)
  if (report.scope.kind === 'all') parts[0] = `${scopeLabel(report.scope)}（${range}）`
  return parts.join(' · ')
}

/**
 * A new thread, or the one given, with a review added (older reviews lose their material).
 * @param material - what the reviewer was given; undefined for a review added afterwards (its conclusion only).
 */
export function withReview(thread: StoredThread | undefined, report: Report, material: string | undefined, roots: readonly string[]): StoredThread {
  const entries: StoredEntry[] = (thread?.entries ?? []).map((entry) => {
    if (entry.kind !== 'review' || entry.material === undefined) return entry
    const { material: _dropped, ...rest } = entry
    return rest
  })
  entries.push({
    kind: 'review',
    id: randomUUID(),
    at: report.createdAt,
    reportId: report.id,
    label: reviewLabel(report),
    provider: report.provider,
    model: report.model,
    answer: answerOf(report),
    ...(material !== undefined && material !== '' ? { material } : {}),
    ...(roots.length > 0 ? { roots: [...roots] } : {}),
  })
  return { startedAt: thread?.startedAt ?? Date.now(), entries: entries.slice(-MAX_THREAD_ENTRIES) }
}

/** A thread with one exchange of the discussion added. */
export function withChat(thread: StoredThread | undefined, user: StoredChat, reply: StoredChat): StoredThread {
  return { startedAt: thread?.startedAt ?? Date.now(), entries: [...(thread?.entries ?? []), user, reply].slice(-MAX_THREAD_ENTRIES) }
}

/** The newest review of the thread. */
export function latestReview(thread: StoredThread | undefined): StoredReview | undefined {
  const entries = thread?.entries ?? []
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!
    if (entry.kind === 'review') return entry
  }
  return undefined
}

function timeOf(at: number): string {
  const date = new Date(at)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** What happened to a review's findings afterwards, as far as the user acted on them. */
function afterwards(report: Report | undefined): string {
  if (report === undefined) return ''
  const notes: string[] = []
  const dismissed = report.findings.map((item, i) => (item.dismissed === true ? i + 1 : 0)).filter((i) => i > 0)
  if (dismissed.length > 0) notes.push(`用户选择忽略第 ${dismissed.join('、')} 条问题`)
  if (report.sentAt !== undefined) notes.push('这些问题已经发给了主对话')
  return notes.length > 0 ? `\n（之后：${notes.join('；')}。）` : ''
}

export interface History {
  /** The record, ready to put before the new request; '' when there is none. */
  text: string
  /** Reviews in the record. */
  reviews: number
  /** Discussion exchanges in the record. */
  chats: number
  /** Entries left out (the oldest), for the budget. */
  dropped: number
}

/** The instruction that ends a review request: not wanted when the request is quoted as history. */
const ASK_TAIL = /\n*请审查上面的内容，按要求输出 JSON。\s*$/

/**
 * The thread as one block of text for the next call. It goes into the same
 * user message as the new request, not as earlier messages: agent-style
 * providers (dsh-agy-link) rebuild or drop earlier messages by their own
 * rules, and every provider reads one message the same way.
 * @param keepLatestMaterial - true for the discussion: the newest review comes
 *   with the material it was given, so the reviewer can talk about it. A new
 *   review brings its own material and sends every earlier review as a
 *   conclusion only.
 * @param budget - characters of record besides that material.
 */
export function historyBlock(thread: StoredThread | undefined, reports: readonly Report[], options: { keepLatestMaterial: boolean; budget: number }): History {
  const entries = thread?.entries ?? []
  const latest = latestReview(thread)
  const byId = new Map(reports.map((report) => [report.id, report]))
  const parts: Array<{ text: string; size: number; pinned: boolean; review: boolean }> = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    if (entry.kind === 'review') {
      const full = options.keepLatestMaterial && entry === latest && entry.material !== undefined
      const head = `### ${full ? '最近一次审查' : '之前的一次审查'} · ${entry.label} · ${timeOf(entry.at)}${afterwards(byId.get(entry.reportId))}`
      const body = full
        ? `当时发给你的内容：\n<<<\n${entry.material!.replace(ASK_TAIL, '')}\n>>>\n你的结论：\n${entry.answer}`
        : `（当时发给你的对话和文件已省略。）\n你的结论：\n${entry.answer}`
      const text = `${head}\n${body}`
      parts.push({ text, size: full ? 0 : text.length, pinned: full, review: true })
      continue
    }
    // A discussion exchange is stored as a user message followed by the reviewer's reply; anything else is skipped.
    const next = entries[i + 1]
    if (entry.role === 'user' && next !== undefined && next.kind === 'chat' && next.role === 'reviewer') {
      const text = `### 讨论 · ${timeOf(entry.at)}\n用户：${entry.text}\n你：${next.text}`
      parts.push({ text, size: text.length, pinned: false, review: false })
      i += 1
    }
  }
  // Keep the newest parts within the budget; once one is left out, everything older goes too (the review with its material always stays).
  let used = 0
  let cut = -1
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!
    if (part.pinned) continue
    if (used + part.size > options.budget) {
      cut = i
      break
    }
    used += part.size
  }
  const kept = parts.filter((part, i) => i > cut || part.pinned)
  const dropped = parts.length - kept.length
  if (kept.length === 0) return { text: '', reviews: 0, chats: 0, dropped }
  const text = [
    '# 你之前对这个对话的审查和讨论（从早到晚；这是记录，不是新的要求）',
    ...(dropped > 0 ? [`（更早的 ${dropped} 段审查和讨论已省略。）`] : []),
    ...kept.map((part) => part.text),
  ].join('\n\n')
  return { text, reviews: kept.filter((part) => part.review).length, chats: kept.filter((part) => !part.review).length, dropped }
}

/** A stored discussion message. */
export function chatEntry(role: 'user' | 'reviewer', text: string, extra: Omit<StoredChat, 'kind' | 'id' | 'at' | 'role' | 'text'> = {}): StoredChat {
  return { kind: 'chat', id: randomUUID(), at: Date.now(), role, text, ...extra }
}
