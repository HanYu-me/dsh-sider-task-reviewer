/**
 * Saved reviews and settings, on disk under `~/.dsh/sider-task-reviewer/`
 * (moves with `DSH_SIDER_TASK_REVIEWER_DIR`):
 * - `sessions/<id>.json`: one conversation's reports and the reviewer's own
 *   conversation about it (its reviews and the discussion of them);
 * - `settings.json`: the defaults for every conversation and the review prompts.
 * Writes go to a temporary file renamed into place, so a crash never leaves
 * half a file. Calls for one file are serialized.
 * @module dsh-sider-task-reviewer/store
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { BUILTIN_PROMPT_ID, type GlobalSettings, type ModelRoute, type Report, type ReviewPrompt, type ReviewScope, type SessionSettings } from './shared/protocol'
import { sanitizeThread, type StoredThread } from './thread'

/** Most reports kept per conversation (oldest go first). */
export const MAX_REPORTS = 100
export const MAX_PROMPTS = 30
export const MAX_PROMPT_CHARS = 20_000

export interface SessionFile {
  version: 1
  settings: SessionSettings
  /** Newest first. */
  reports: Report[]
  /** The reviewer's own conversation about this one. */
  thread?: StoredThread
}

export function defaultStoreDir(): string {
  return process.env.DSH_SIDER_TASK_REVIEWER_DIR ?? join(homedir(), '.dsh', 'sider-task-reviewer')
}

export const DEFAULT_SETTINGS: SessionSettings = { live: false, depth: 'quick', scope: { kind: 'last' }, content: 'both', loopRounds: 5 }
export const DEFAULT_GLOBAL: GlobalSettings = { liveTrigger: 'turn', activePromptId: BUILTIN_PROMPT_ID }

function routeOf(value: unknown): ModelRoute | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const route = value as Partial<ModelRoute>
  if (typeof route.provider !== 'string' || typeof route.model !== 'string' || route.provider === '' || route.model === '') return undefined
  return { provider: route.provider, model: route.model, ...(typeof route.effort === 'string' && route.effort !== '' ? { effort: route.effort } : {}) }
}

function scopeOf(value: unknown): ReviewScope {
  const scope = (typeof value === 'object' && value !== null ? value : {}) as Partial<{ kind: string; from: number; to: number }>
  if (scope.kind === 'all') return { kind: 'all' }
  if (scope.kind === 'range' && Number.isFinite(scope.from) && Number.isFinite(scope.to)) return { kind: 'range', from: Math.max(1, Math.floor(scope.from!)), to: Math.max(1, Math.floor(scope.to!)) }
  return { kind: 'last' }
}

export function clampRounds(value: unknown): number {
  const rounds = Math.floor(Number(value))
  return Number.isFinite(rounds) ? Math.min(20, Math.max(1, rounds)) : DEFAULT_SETTINGS.loopRounds
}

export function sanitizeSettings(value: unknown): SessionSettings {
  const settings = (typeof value === 'object' && value !== null ? value : {}) as Partial<SessionSettings>
  const route = routeOf(settings.route)
  return {
    live: settings.live === true,
    depth: settings.depth === 'deep' ? 'deep' : 'quick',
    scope: scopeOf(settings.scope),
    content: settings.content === 'conversation' || settings.content === 'files' ? settings.content : 'both',
    loopRounds: settings.loopRounds === undefined ? DEFAULT_SETTINGS.loopRounds : clampRounds(settings.loopRounds),
    ...(route !== undefined ? { route } : {}),
  }
}

function sanitizeGlobal(value: unknown): GlobalSettings {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Partial<GlobalSettings>
  return {
    liveTrigger: record.liveTrigger === 'step' ? 'step' : 'turn',
    activePromptId: typeof record.activePromptId === 'string' && record.activePromptId !== '' ? record.activePromptId : BUILTIN_PROMPT_ID,
  }
}

/** The review choices kept in settings.json (an older file's default model becomes the model). */
function reviewOf(raw: Record<string, unknown> | undefined): SessionSettings {
  const review = sanitizeSettings(raw?.review)
  const legacy = routeOf(raw?.route)
  return review.route === undefined && legacy !== undefined ? { ...review, route: legacy } : review
}

/** Stored prompts: custom ones, and the built-in one when it was edited. */
export function sanitizePrompts(value: unknown): ReviewPrompt[] {
  if (!Array.isArray(value)) return []
  const out: ReviewPrompt[] = []
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue
    const item = raw as Partial<ReviewPrompt>
    if (typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,60}$/.test(item.id) || typeof item.text !== 'string') continue
    const name = typeof item.name === 'string' && item.name.trim() !== '' ? item.name.trim().slice(0, 40) : '未命名'
    out.push({ id: item.id, name, text: item.text.slice(0, MAX_PROMPT_CHARS) })
    if (out.length >= MAX_PROMPTS) break
  }
  return out
}

function sanitize(value: unknown): SessionFile {
  const record = typeof value === 'object' && value !== null ? (value as Partial<SessionFile>) : {}
  const thread = sanitizeThread(record.thread)
  return {
    version: 1,
    settings: sanitizeSettings(record.settings),
    reports: Array.isArray(record.reports) ? record.reports.filter((item) => typeof item === 'object' && item !== null && typeof item.id === 'string').slice(0, MAX_REPORTS) : [],
    ...(thread !== undefined ? { thread } : {}),
  }
}

/** Ids become file names: keep them to a safe alphabet. */
function fileNameOf(sessionId: string): string {
  return sessionId.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) + '.json'
}

interface GlobalFile {
  settings: GlobalSettings
  review: SessionSettings
  prompts: ReviewPrompt[]
}

export interface ReviewStore {
  loadGlobal(): Promise<GlobalSettings>
  saveGlobal(settings: GlobalSettings): Promise<GlobalSettings>
  /** The review choices shared by every conversation. */
  loadReview(): Promise<SessionSettings>
  saveReview(settings: SessionSettings): Promise<SessionSettings>
  loadPrompts(): Promise<ReviewPrompt[]>
  savePrompts(prompts: ReviewPrompt[]): Promise<ReviewPrompt[]>
  load(sessionId: string): Promise<SessionFile>
  saveSettings(sessionId: string, settings: SessionSettings): Promise<SessionFile>
  addReport(report: Report): Promise<SessionFile>
  updateReport(sessionId: string, id: string, change: (report: Report) => Report): Promise<Report | undefined>
  removeReport(sessionId: string, id: string): Promise<boolean>
  /** Change the reviewer's conversation (undefined clears it). */
  updateThread(sessionId: string, change: (thread: StoredThread | undefined) => StoredThread | undefined): Promise<StoredThread | undefined>
}

/** Shared bookkeeping of both stores: per-conversation files and the global file. */
function makeStore(io: { read(name: string): Promise<unknown>; write(name: string, value: unknown): Promise<void> }): ReviewStore {
  const cache = new Map<string, SessionFile>()
  const queues = new Map<string, Promise<unknown>>()
  let global: GlobalFile | undefined
  const serial = <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const before = queues.get(key) ?? Promise.resolve()
    const next = before.then(task, task)
    queues.set(key, next.catch(() => undefined))
    return next
  }
  const read = async (sessionId: string): Promise<SessionFile> => {
    const known = cache.get(sessionId)
    if (known !== undefined) return known
    const file = sanitize(await io.read(`sessions/${fileNameOf(sessionId)}`))
    cache.set(sessionId, file)
    return file
  }
  const write = async (sessionId: string, file: SessionFile): Promise<void> => {
    await io.write(`sessions/${fileNameOf(sessionId)}`, file)
    cache.set(sessionId, file)
  }
  const readGlobal = async (): Promise<GlobalFile> => {
    if (global !== undefined) return global
    const raw = (await io.read('settings.json')) as Record<string, unknown> | undefined
    global = { settings: sanitizeGlobal(raw), review: reviewOf(raw), prompts: sanitizePrompts(raw?.prompts) }
    return global
  }
  const writeGlobal = async (next: GlobalFile): Promise<void> => {
    await io.write('settings.json', { ...next.settings, review: next.review, prompts: next.prompts })
    global = next
  }
  return {
    loadGlobal: () => serial('', async () => (await readGlobal()).settings),
    saveGlobal: (settings) =>
      serial('', async () => {
        const next = { ...(await readGlobal()), settings: sanitizeGlobal(settings) }
        await writeGlobal(next)
        return next.settings
      }),
    loadReview: () => serial('', async () => (await readGlobal()).review),
    saveReview: (settings) =>
      serial('', async () => {
        const next = { ...(await readGlobal()), review: sanitizeSettings(settings) }
        await writeGlobal(next)
        return next.review
      }),
    loadPrompts: () => serial('', async () => (await readGlobal()).prompts),
    savePrompts: (prompts) =>
      serial('', async () => {
        const next = { ...(await readGlobal()), prompts: sanitizePrompts(prompts) }
        await writeGlobal(next)
        return next.prompts
      }),
    load: (sessionId) => serial(sessionId, () => read(sessionId)),
    saveSettings: (sessionId, settings) =>
      serial(sessionId, async () => {
        const file = { ...(await read(sessionId)), settings: sanitizeSettings(settings) }
        await write(sessionId, file)
        return file
      }),
    addReport: (report) =>
      serial(report.sessionId, async () => {
        const current = await read(report.sessionId)
        const file = { ...current, reports: [report, ...current.reports.filter((item) => item.id !== report.id)].slice(0, MAX_REPORTS) }
        await write(report.sessionId, file)
        return file
      }),
    updateReport: (sessionId, id, change) =>
      serial(sessionId, async () => {
        const current = await read(sessionId)
        const found = current.reports.find((item) => item.id === id)
        if (found === undefined) return undefined
        const next = change(found)
        await write(sessionId, { ...current, reports: current.reports.map((item) => (item.id === id ? next : item)) })
        return next
      }),
    removeReport: (sessionId, id) =>
      serial(sessionId, async () => {
        const current = await read(sessionId)
        if (!current.reports.some((item) => item.id === id)) return false
        await write(sessionId, { ...current, reports: current.reports.filter((item) => item.id !== id) })
        return true
      }),
    updateThread: (sessionId, change) =>
      serial(sessionId, async () => {
        const current = await read(sessionId)
        const next = change(current.thread)
        const { thread: _old, ...rest } = current
        await write(sessionId, next !== undefined ? { ...rest, thread: next } : rest)
        return next
      }),
  }
}

/** The file store. */
export function createFileStore(dir: string = defaultStoreDir()): ReviewStore {
  return makeStore({
    read: async (name) => {
      try {
        return JSON.parse(await readFile(join(dir, name), 'utf8')) as unknown
      } catch {
        return undefined
      }
    },
    write: async (name, value) => {
      const target = join(dir, name)
      await mkdir(join(target, '..'), { recursive: true })
      const temp = `${target}.${process.pid}.${Date.now()}.tmp`
      await writeFile(temp, JSON.stringify(value, null, 1), 'utf8')
      await rename(temp, target)
    },
  })
}

/** An in-memory store for tests. */
export function createMemoryStore(): ReviewStore {
  const files = new Map<string, string>()
  return makeStore({
    read: async (name) => (files.has(name) ? (JSON.parse(files.get(name)!) as unknown) : undefined),
    write: async (name, value) => {
      files.set(name, JSON.stringify(value))
    },
  })
}

/** A saved review as Markdown, for export. */
export function reportMarkdown(report: Report, labels: { verdict: Record<string, string>; severity: Record<string, string>; category: Record<string, string>; content: Record<string, string>; scope: string }): string {
  const lines = [
    `# 任务审查报告 · ${labels.verdict[report.verdict] ?? report.verdict}`,
    '',
    `- 时间：${new Date(report.createdAt).toLocaleString('zh-CN', { hour12: false })}`,
    `- 范围：${labels.scope}（第 ${report.turns.from}–${report.turns.to} 轮） · ${labels.content[report.content] ?? report.content}`,
    `- 审查模型：${report.provider} / ${report.model}${report.effort !== undefined ? `（思考强度 ${report.effort}）` : ''}`,
    `- 提示词：${report.promptName}`,
    `- 深度：${report.usedDepth === 'deep' ? '深入（查看了文件）' : '快速'}${report.trigger === 'live' ? ' · 实时审查' : ''}${report.loop !== undefined ? ` · 连续审查第 ${report.loop.round}/${report.loop.max} 轮` : ''}`,
    `- 会话：${report.sessionId}`,
    '',
    '## 结论',
    '',
    report.summary || '（无）',
  ]
  const open = report.findings.filter((item) => item.dismissed !== true)
  if (open.length > 0) {
    lines.push('', '## 发现的问题', '')
    open.forEach((item, i) => {
      lines.push(`### ${i + 1}. [${labels.severity[item.severity] ?? item.severity} · ${labels.category[item.category] ?? item.category}] ${item.title}`, '')
      if (item.detail !== '') lines.push(item.detail, '')
      if (item.evidence !== '') lines.push(`- 证据：${item.evidence}`)
      if (item.suggestion !== '') lines.push(`- 建议：${item.suggestion}`)
      lines.push('')
    })
  }
  if (report.checked.length > 0) lines.push('', '## 核对过、没有问题', '', ...report.checked.map((item) => `- ${item}`))
  if (report.files !== undefined && report.files.length > 0) lines.push('', '## 审查的文件', '', ...report.files.map((item) => `- ${item}`))
  if (report.tools.length > 0) lines.push('', '## 审查时查看了', '', ...report.tools.map((item) => `- ${item.name} ${item.target}${item.ok ? '' : '（失败）'}`))
  if (report.notes.length > 0) lines.push('', '## 备注', '', ...report.notes.map((item) => `- ${item}`))
  if (report.raw !== undefined) lines.push('', '## 审查模型原文', '', '```', report.raw, '```')
  return lines.join('\n') + '\n'
}
