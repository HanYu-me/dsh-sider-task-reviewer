/**
 * Browser side of the routes, plus one shared, polled state per conversation
 * that the panel and the shield button both read.
 * @module dsh-sider-task-reviewer/client/api
 */
import { useEffect, useSyncExternalStore } from 'react'
import { REVIEW_PREFIX } from '../shared/protocol'
import type { ApiResult, ChatStreamEvent, GlobalSettings, LoopState, ModelCatalog, ModelEfforts, ModelRoute, Report, ReviewContent, ReviewDepth, ReviewPrompt, ReviewScope, SendResult, SessionSettings, SessionState, ThreadEntry } from '../shared/protocol'

/** What a review covers and how; every field optional (the conversation's settings fill the rest on the host). */
export interface ReviewOptions {
  scope: ReviewScope
  depth: ReviewDepth
  content: ReviewContent
  route?: ModelRoute
  promptId?: string
}

/** Read a server-sent event stream to its end, handing each event over. */
async function readEvents<E>(response: Response, onEvent: (event: E) => void): Promise<void> {
  if (!response.ok || response.body === null) {
    let message = `请求没有成功（HTTP ${response.status}）`
    try {
      const parsed = (await response.json()) as ApiResult<unknown>
      if (!parsed.ok) message = parsed.error
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let cut = buffer.indexOf('\n\n')
    while (cut >= 0) {
      const frame = buffer.slice(0, cut)
      buffer = buffer.slice(cut + 2)
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data: ')) continue
        let event: E
        try {
          event = JSON.parse(line.slice(6)) as E
        } catch {
          continue
        }
        onEvent(event)
      }
      cut = buffer.indexOf('\n\n')
    }
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(REVIEW_PREFIX + path, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let parsed: ApiResult<T>
  try {
    parsed = (await response.json()) as ApiResult<T>
  } catch {
    throw new Error(`审查插件没有响应（HTTP ${response.status}）`)
  }
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.value
}

export const api = {
  state: (session: string) => call<SessionState>(`/state?session=${encodeURIComponent(session)}`),
  models: () => call<ModelCatalog>('/models'),
  settings: (session: string, patch: { live?: boolean; depth?: ReviewDepth; route?: ModelRoute | null; scope?: ReviewScope; content?: ReviewContent; promptId?: string | null; loopRounds?: number }) =>
    call<SessionSettings>('/settings', { session, ...patch }),
  global: (patch: { route?: ModelRoute | null; liveTrigger?: 'turn' | 'step'; activePromptId?: string }) => call<GlobalSettings>('/global', patch),
  prompts: () => call<ReviewPrompt[]>('/prompts'),
  savePrompt: (prompt: { id?: string; name: string; text: string }) => call<{ prompts: ReviewPrompt[]; id: string }>('/prompt', prompt),
  deletePrompt: (id: string) => call<ReviewPrompt[]>('/prompt/delete', { id }),
  startLoop: (session: string, options: ReviewOptions & { maxRounds: number }) => call<LoopState>('/loop/start', { session, ...options }),
  stopLoop: (session: string) => call<LoopState | null>('/loop/stop', { session }),
  cancel: (session: string) => call<boolean>('/cancel', { session }),
  send: (session: string, text: string, reportId?: string) => call<SendResult>('/send', { session, text, ...(reportId !== undefined ? { reportId } : {}) }),
  dismiss: (session: string, reportId: string, index: number, dismissed: boolean) => call<unknown>('/dismiss', { session, reportId, index, dismissed }),
  remove: (session: string, reportId: string) => call<boolean>('/remove', { session, reportId }),
  async exportMarkdown(session: string, reportId: string): Promise<string> {
    const response = await fetch(`${REVIEW_PREFIX}/export?session=${encodeURIComponent(session)}&report=${encodeURIComponent(reportId)}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`导出失败（HTTP ${response.status}）`)
    return response.text()
  },
  cancelChat: (session: string) => call<boolean>('/chat/cancel', { session }),
  resetThread: (session: string) => call<boolean>('/thread/reset', { session }),
  /**
   * Say something to the reviewer about its reviews of a conversation.
   * Resolves with its reply; the reply streams in through `onEvent`.
   */
  async chat(session: string, text: string, onEvent: (event: ChatStreamEvent) => void, route?: ModelRoute): Promise<ThreadEntry> {
    const response = await fetch(`${REVIEW_PREFIX}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, text, ...(route !== undefined ? { route } : {}) }),
    })
    let failure: string | undefined
    let reply: ThreadEntry | undefined
    await readEvents<ChatStreamEvent>(response, (event) => {
      if (event.type === 'error') failure = event.message
      if (event.type === 'done') reply = event.entry
      onEvent(event)
    })
    refreshSoon(session)
    if (failure !== undefined) throw new Error(failure)
    if (reply === undefined) throw new Error('审查模型没有回答')
    return reply
  },
  /**
   * Start a review. Resolves when it is over (the progress itself is read
   * from the polled state); rejects with the reason when it fails.
   */
  async review(session: string, options: ReviewOptions): Promise<Report | undefined> {
    const response = await fetch(`${REVIEW_PREFIX}/review`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, ...options }),
    })
    let failure: string | undefined
    let report: Report | undefined
    try {
      await readEvents<{ type: string; message?: string; report?: Report }>(response, (event) => {
        if (event.type === 'error') failure = event.message
        if (event.type === 'done') report = event.report
        if (event.type === 'phase' || event.type === 'tool' || event.type === 'done' || event.type === 'error') refreshSoon(session)
      })
    } catch (error) {
      throw new Error((error instanceof Error ? error.message : String(error)).replace('请求没有成功', '审查没有开始'))
    }
    refreshSoon(session)
    if (failure !== undefined) throw new Error(failure)
    return report
  },
}

// ---------------------------------------------------------------- shared polled state

interface Entry {
  /** Bumped on every change, for useSyncExternalStore. */
  version: number
  state?: SessionState
  error?: string
  listeners: Set<() => void>
  users: number
  timer?: ReturnType<typeof setTimeout>
  inflight: boolean
}

const entries = new Map<string, Entry>()

function entryOf(session: string): Entry {
  let entry = entries.get(session)
  if (entry === undefined) {
    entry = { version: 0, listeners: new Set(), users: 0, inflight: false }
    entries.set(session, entry)
  }
  return entry
}

function notify(entry: Entry): void {
  entry.version += 1
  for (const listener of entry.listeners) listener()
}

async function poll(session: string): Promise<void> {
  const entry = entryOf(session)
  if (entry.timer !== undefined) clearTimeout(entry.timer)
  entry.timer = undefined
  if (entry.users === 0) return
  if (!entry.inflight && (typeof document === 'undefined' || !document.hidden)) {
    entry.inflight = true
    try {
      entry.state = await api.state(session)
      entry.error = undefined
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error)
    } finally {
      entry.inflight = false
    }
    notify(entry)
  }
  if (entry.users > 0) entry.timer = setTimeout(() => void poll(session), entry.state?.running !== undefined || entry.state?.chatting !== undefined ? 1000 : 5000)
}

/** Read the state again now (after an action), not at the next tick. */
export function refreshSoon(session: string): void {
  const entry = entries.get(session)
  if (entry === undefined || entry.users === 0) return
  if (entry.timer !== undefined) clearTimeout(entry.timer)
  entry.timer = setTimeout(() => void poll(session), 50)
}

/** Put a state in directly (after an action returned one). */
export function patchState(session: string, change: (state: SessionState) => SessionState): void {
  const entry = entries.get(session)
  if (entry?.state === undefined) return
  entry.state = change(entry.state)
  notify(entry)
}

/** The polled state of one conversation; polling runs while anything uses it. */
export function useReviewState(session: string | undefined): { state?: SessionState; error?: string } {
  useEffect(() => {
    if (session === undefined) return undefined
    const entry = entryOf(session)
    entry.users += 1
    if (entry.users === 1) void poll(session)
    const onVisible = (): void => {
      if (!document.hidden) refreshSoon(session)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      entry.users -= 1
      document.removeEventListener('visibilitychange', onVisible)
      if (entry.users === 0 && entry.timer !== undefined) {
        clearTimeout(entry.timer)
        entry.timer = undefined
      }
    }
  }, [session])
  useSyncExternalStore(
    (listener) => {
      if (session === undefined) return () => {}
      const entry = entryOf(session)
      entry.listeners.add(listener)
      return () => entry.listeners.delete(listener)
    },
    () => (session === undefined ? 0 : (entries.get(session)?.version ?? 0)),
  )
  const snapshot = session === undefined ? undefined : entries.get(session)
  return { ...(snapshot?.state !== undefined ? { state: snapshot.state } : {}), ...(snapshot?.error !== undefined ? { error: snapshot.error } : {}) }
}

/** Forget every polled state (tests). */
export function resetReviewStates(): void {
  for (const entry of entries.values()) if (entry.timer !== undefined) clearTimeout(entry.timer)
  entries.clear()
}

// ---------------------------------------------------------------- model catalog

let catalog: { at: number; value: Promise<ModelCatalog> } | undefined

export function loadCatalog(force = false): Promise<ModelCatalog> {
  if (!force && catalog !== undefined && Date.now() - catalog.at < 60_000) return catalog.value
  const value = api.models().catch((error) => {
    catalog = undefined
    throw error
  })
  catalog = { at: Date.now(), value }
  return value
}

// ---------------------------------------------------------------- reasoning efforts

const effortCache = new Map<string, Promise<ModelEfforts>>()

/** The reasoning efforts of one model (cached for the page's life). */
export function loadEfforts(route: ModelRoute): Promise<ModelEfforts> {
  const key = `${route.provider}\u0000${route.model}`
  const known = effortCache.get(key)
  if (known !== undefined) return known
  const value = call<ModelEfforts>(`/efforts?provider=${encodeURIComponent(route.provider)}&model=${encodeURIComponent(route.model)}`).catch(() => {
    effortCache.delete(key)
    return { efforts: [] } as ModelEfforts
  })
  effortCache.set(key, value)
  return value
}
