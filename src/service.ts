/**
 * The reviewer service:
 * - runs reviews for a conversation (at most one at a time per conversation)
 *   over the conversation, the files it wrote, or both, with the picked
 *   model, reasoning effort and review prompt, and saves the reports;
 * - live review: watches conversations with it switched on and reviews each
 *   turn as it ends (it only reports);
 * - continuous review: review → send the findings to the working agent →
 *   wait for its turn to end → review the fix → … until a review passes or the
 *   round limit is reached;
 * - sends findings back only when asked (or when a continuous review the user
 *   started does it);
 * - keeps the review prompts (the built-in one, editable and resettable, and
 *   the user's own).
 * @module dsh-sider-task-reviewer/service
 */
import { randomUUID } from 'node:crypto'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { filesSection, reviewRoots, touchedFiles } from './files'
import { parseReview } from './parse'
import { BUILTIN_PROMPTS, systemPrompt, userPrompt } from './prompt'
import { addCounts, redact, redactionNote } from './redact'
import { ReviewError, runReview, type LlmStreamFace } from './runner'
import { messageFor, openFindings } from './shared/message'
import { BUILTIN_PROMPT_ID, CATEGORY_LABELS, CONTENT_LABELS, scopeLabel, SEVERITY_LABELS, VERDICT_LABELS } from './shared/protocol'
import type {
  GlobalSettings,
  LoopRequest,
  LoopState,
  ModelCatalog,
  ModelEfforts,
  ModelRoute,
  Report,
  ReviewContent,
  ReviewPrompt,
  ReviewRequest,
  ReviewScope,
  ReviewStreamEvent,
  ReviewTrigger,
  Running,
  SendResult,
  SessionSettings,
  SessionState,
} from './shared/protocol'
import { clampRounds, MAX_PROMPT_CHARS, MAX_PROMPTS, reportMarkdown, type ReviewStore } from './store'
import { fitTurns, renderBackground, selectTurns, turnsOf, type LogEvent } from './transcript'
import { workspaceOverview } from './workspace'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'sider-task-reviewer': { kind: 'sider-task-reviewer' }
  }
}

/** What the service needs of a live session. */
export interface SessionFace {
  snapshotEvents(): readonly LogEvent[]
  /** `origin: 'subagent'` marks a session a sub-agent runs (live review leaves those alone). */
  readonly header?: { readonly cwd?: string; readonly origin?: string; readonly delegationDepth?: number }
  requestHeader?(): { config?: { provider?: unknown; model?: unknown } } | undefined
}

/** What the service needs of the agent driving a session. */
export interface AgentFace {
  readonly status?: string
  steer(message: unknown): void
  followup(message: unknown): void
}

export interface CatalogFace {
  listProviders(): ReadonlyArray<{ id: string; name?: string }>
  listModels(provider: string): Promise<ReadonlyArray<{ id: string; name: string }>>
  resolveModelInfo?(provider: string, model: string): Promise<{ reasoning?: { efforts?: ReadonlyArray<{ id: string; name?: string; description?: string }>; defaultEffort?: string } }>
}

/** The host services, read at call time (any of them may come and go). */
export interface HostFaces {
  session(id: string): SessionFace | undefined
  /** Ids of the conversations the host has loaded. */
  sessionIds?(): string[]
  agent(id: string): AgentFace | undefined
  llm(): (LlmStreamFace & Partial<CatalogFace>) | undefined
  defaultRoute(): ModelRoute | undefined
}

export interface ServiceConfig {
  /** Reviewer model used when a conversation has none picked. */
  route?: ModelRoute
  /** Characters of conversation and files sent to the reviewer at most. */
  maxTranscriptChars: number
  maxToolCalls: number
  maxTokens: number
  timeoutMs: number
  /** Deep reviews call the model once per round of tool use: they get longer. */
  deepTimeoutMs: number
  /** Quiet time after a step before a live review starts. */
  liveDebounceMs: number
  /** Least time between two live reviews of one conversation. */
  liveMinGapMs: number
  /** How long a continuous review waits for the working agent to finish its fix. */
  loopWaitMs: number
  /** Pause after the working agent's turn ends before the next round looks (it may queue another turn). */
  loopSettleMs: number
}

export const DEFAULT_CONFIG: ServiceConfig = {
  maxTranscriptChars: 120_000,
  maxToolCalls: 12,
  maxTokens: 16000,
  timeoutMs: 300_000,
  deepTimeoutMs: 600_000,
  liveDebounceMs: 6000,
  liveMinGapMs: 45_000,
  loopWaitMs: 45 * 60_000,
  loopSettleMs: 1500,
}

interface Job {
  running: Running
  controller: AbortController
  listeners: Set<(event: ReviewStreamEvent) => void>
  done: Promise<Report>
}

interface LiveWatch {
  timer?: ReturnType<typeof setTimeout>
  lastAt: number
  /** Log position the last live review saw, so an unchanged conversation is not reviewed twice. */
  lastSeq: number
}

interface LoopRun {
  state: LoopState
  request: LoopRequest
  /** Log position when the findings went to the working agent: the next round reviews the turns after it. */
  sentSeq?: number
  /** Findings waiting for the working agent to be idle. */
  pending?: { text: string; reportId: string }
  last?: Report
  /** Files earlier rounds looked at (the next round keeps looking at them). */
  files: string[]
  timer?: ReturnType<typeof setTimeout>
}

/** Extra inputs of a review that a plain request does not carry. */
interface ReviewExtras {
  loop?: { id: string; round: number; max: number }
  previous?: string
  previousLabel?: string
  extraFiles?: readonly string[]
}

function isBuiltin(id: string): boolean {
  return BUILTIN_PROMPTS.some((item) => item.id === id)
}

const ACTIVE_LOOP: ReadonlySet<LoopState['status']> = new Set(['reviewing', 'sending', 'waiting'])

function routeOf(value: { provider?: unknown; model?: unknown } | undefined): ModelRoute | undefined {
  if (value === undefined || typeof value.provider !== 'string' || typeof value.model !== 'string' || value.provider === '' || value.model === '') return undefined
  return { provider: value.provider, model: value.model }
}

/** A short form of a report for the next round to compare against. */
function findingsDigest(report: Report): string {
  const open = openFindings(report)
  if (open.length === 0) return report.summary
  return open.map((item, i) => `${i + 1}. [${item.severity}] ${item.title}${item.evidence !== '' ? `（${item.evidence}）` : ''}${item.suggestion !== '' ? ` —— 建议：${item.suggestion}` : ''}`).join('\n')
}

export class ReviewService {
  private readonly jobs = new Map<string, Job>()
  private readonly watches = new Map<string, LiveWatch>()
  private readonly loops = new Map<string, LoopRun>()
  private readonly errors = new Map<string, string>()
  private readonly effortCache = new Map<string, Promise<ModelEfforts>>()
  /** Session events seen per conversation (diagnostics: shows whether live review can hear anything). */
  private readonly heard = new Map<string, { count: number; lastType: string; lastAt: number }>()
  private disposed = false

  constructor(
    private readonly faces: HostFaces,
    private readonly store: ReviewStore,
    private config: ServiceConfig = DEFAULT_CONFIG,
  ) {}

  updateConfig(config: ServiceConfig): void {
    this.config = config
  }

  // ---------------------------------------------------------------- models

  /** The working model of a conversation, from its last request header. */
  private sessionRoute(sessionId: string): ModelRoute | undefined {
    try {
      return routeOf(this.faces.session(sessionId)?.requestHeader?.()?.config)
    } catch {
      return undefined
    }
  }

  /** The reviewer route: the one asked for, the panel's choice (shared by every conversation), the harness default, the conversation's own. */
  async routeFor(sessionId: string, picked?: ModelRoute): Promise<(ModelRoute & { from: 'settings' | 'harness' | 'conversation' }) | undefined> {
    if (picked !== undefined) return { ...picked, from: 'settings' }
    const chosen = (await this.store.loadReview()).route ?? this.config.route
    if (chosen !== undefined) return { ...chosen, from: 'settings' }
    const harness = this.faces.defaultRoute()
    if (harness !== undefined) return { ...harness, from: 'harness' }
    const own = this.sessionRoute(sessionId)
    return own !== undefined ? { ...own, from: 'conversation' } : undefined
  }

  async catalog(): Promise<ModelCatalog> {
    const llm = this.faces.llm()
    const fallback = this.config.route ?? this.faces.defaultRoute()
    if (llm?.listProviders === undefined || llm.listModels === undefined) return { groups: [], ...(fallback !== undefined ? { fallback } : {}) }
    const providers = llm.listProviders()
    const groups = await Promise.all(
      providers.map(async (provider) => {
        try {
          const models = await llm.listModels!(provider.id)
          return { id: provider.id, name: provider.name !== undefined && provider.name !== '' ? provider.name : provider.id, models: models.map((model) => ({ id: model.id, name: model.name || model.id })) }
        } catch {
          return undefined
        }
      }),
    )
    return { groups: groups.filter((group): group is NonNullable<typeof group> => group !== undefined && group.models.length > 0), ...(fallback !== undefined ? { fallback } : {}) }
  }

  /** The reasoning efforts a model offers (empty when it has none or the host cannot say). */
  efforts(provider: string, model: string): Promise<ModelEfforts> {
    const key = `${provider}\u0000${model}`
    const known = this.effortCache.get(key)
    if (known !== undefined) return known
    const llm = this.faces.llm()
    const value = (async (): Promise<ModelEfforts> => {
      if (typeof llm?.resolveModelInfo !== 'function') return { efforts: [] }
      try {
        const info = await llm.resolveModelInfo(provider, model)
        const efforts = (info.reasoning?.efforts ?? []).filter((item) => typeof item.id === 'string').map((item) => ({ id: item.id, name: item.name || item.id, ...(item.description !== undefined ? { description: item.description } : {}) }))
        return { efforts, ...(typeof info.reasoning?.defaultEffort === 'string' ? { defaultEffort: info.reasoning.defaultEffort } : {}) }
      } catch {
        return { efforts: [] }
      }
    })()
    this.effortCache.set(key, value)
    setTimeout(() => this.effortCache.delete(key), 10 * 60_000).unref?.()
    return value
  }

  // ---------------------------------------------------------------- prompts

  /** The built-in prompts (as edited, where they were) and the user's own. */
  async prompts(): Promise<ReviewPrompt[]> {
    const stored = await this.store.loadPrompts()
    const builtins = BUILTIN_PROMPTS.map((builtin) => {
      const edited = stored.find((item) => item.id === builtin.id)
      return edited !== undefined ? { ...builtin, name: edited.name, text: edited.text, edited: true as const } : builtin
    })
    return [...builtins, ...stored.filter((item) => !isBuiltin(item.id))]
  }

  async promptFor(id: string | undefined): Promise<ReviewPrompt> {
    const all = await this.prompts()
    return all.find((item) => item.id === id) ?? all[0]!
  }

  /** Save a prompt: edit an existing one (the built-in one included) or add a new one (no id). */
  async savePrompt(input: { id?: string; name: string; text: string }): Promise<{ prompts: ReviewPrompt[]; id: string }> {
    const name = input.name.trim().slice(0, 40)
    const text = input.text.slice(0, MAX_PROMPT_CHARS)
    if (name === '') throw new ReviewError('提示词需要一个名字', 'bad-request')
    if (text.trim() === '') throw new ReviewError('提示词不能是空的', 'bad-request')
    const stored = await this.store.loadPrompts()
    let id = input.id
    if (id === undefined || id === '') {
      if (stored.filter((item) => !isBuiltin(item.id)).length >= MAX_PROMPTS - BUILTIN_PROMPTS.length) throw new ReviewError(`最多 ${MAX_PROMPTS - BUILTIN_PROMPTS.length} 个自定义提示词`, 'bad-request')
      id = `p-${randomUUID().slice(0, 8)}`
      await this.store.savePrompts([...stored, { id, name, text }])
    } else if (isBuiltin(id) || stored.some((item) => item.id === id)) {
      const next = stored.some((item) => item.id === id) ? stored.map((item) => (item.id === id ? { id: id!, name, text } : item)) : [...stored, { id, name, text }]
      await this.store.savePrompts(next)
    } else {
      throw new ReviewError('没有这个提示词', 'bad-request')
    }
    return { prompts: await this.prompts(), id }
  }

  /** Delete a prompt of the user's; for a built-in one, put back the original. */
  async deletePrompt(id: string): Promise<ReviewPrompt[]> {
    const stored = await this.store.loadPrompts()
    await this.store.savePrompts(stored.filter((item) => item.id !== id))
    const global = await this.store.loadGlobal()
    if (global.activePromptId === id && !isBuiltin(id)) await this.store.saveGlobal({ ...global, activePromptId: BUILTIN_PROMPT_ID })
    return this.prompts()
  }

  // ---------------------------------------------------------------- settings and state

  /** The loaded conversations, newest activity first (for diagnostics). */
  liveSessions(): { id: string; cwd?: string; turns: number; lastAt?: number; heard?: { count: number; lastType: string; lastAt: number } }[] {
    const ids = this.faces.sessionIds?.() ?? []
    return ids
      .map((id) => {
        const session = this.faces.session(id)
        let turns = 0
        let lastAt: number | undefined
        try {
          const events = session?.snapshotEvents() ?? []
          turns = turnsOf(events).length
          lastAt = events.at(-1)?.time
        } catch {
          turns = 0
        }
        const heard = this.heard.get(id)
        return { id, ...(session?.header?.cwd !== undefined ? { cwd: session.header.cwd } : {}), turns, ...(lastAt !== undefined ? { lastAt } : {}), ...(heard !== undefined ? { heard } : {}) }
      })
      .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0))
  }

  async globalSettings(): Promise<GlobalSettings> {
    return this.store.loadGlobal()
  }

  async setGlobal(patch: { liveTrigger?: 'turn' | 'step'; activePromptId?: string }): Promise<GlobalSettings> {
    const current = await this.store.loadGlobal()
    if (patch.activePromptId !== undefined && !(await this.prompts()).some((item) => item.id === patch.activePromptId)) throw new ReviewError('没有这个提示词', 'bad-request')
    return this.store.saveGlobal({ liveTrigger: patch.liveTrigger ?? current.liveTrigger, activePromptId: patch.activePromptId ?? current.activePromptId })
  }

  async state(sessionId: string): Promise<SessionState> {
    const file = await this.store.load(sessionId)
    const session = this.faces.session(sessionId)
    let turns = 0
    try {
      turns = session !== undefined ? turnsOf(session.snapshotEvents()).length : 0
    } catch {
      turns = 0
    }
    const job = this.jobs.get(sessionId)
    const error = this.errors.get(sessionId)
    const global = await this.store.loadGlobal()
    const effective = await this.routeFor(sessionId)
    const loop = this.loops.get(sessionId)
    return {
      sessionId,
      global,
      ...(effective !== undefined ? { effectiveRoute: effective } : {}),
      live: session !== undefined,
      busy: this.faces.agent(sessionId)?.status === 'running',
      turns,
      ...(session?.header?.cwd !== undefined ? { cwd: session.header.cwd } : {}),
      settings: await this.store.loadReview(),
      ...(job !== undefined ? { running: { ...job.running, tools: [...job.running.tools] } } : {}),
      ...(loop !== undefined ? { loop: { ...loop.state, rounds: loop.state.rounds.map((item) => ({ ...item })) } } : {}),
      reports: file.reports,
      ...(error !== undefined ? { error } : {}),
    }
  }

  /**
   * Change the review choices. They are shared by every conversation: the
   * conversation id is only where the change came from.
   */
  async setSettings(
    _sessionId: string,
    patch: { live?: boolean; depth?: SessionSettings['depth']; route?: ModelRoute | null; scope?: ReviewScope; content?: ReviewContent; loopRounds?: number },
  ): Promise<SessionSettings> {
    const current = await this.store.loadReview()
    const next: SessionSettings = {
      live: patch.live ?? current.live,
      depth: patch.depth ?? current.depth,
      scope: patch.scope ?? current.scope,
      content: patch.content ?? current.content,
      loopRounds: patch.loopRounds !== undefined ? clampRounds(patch.loopRounds) : current.loopRounds,
      ...(patch.route === null ? {} : patch.route !== undefined ? { route: patch.route } : current.route !== undefined ? { route: current.route } : {}),
    }
    const saved = await this.store.saveReview(next)
    if (!saved.live) for (const sessionId of [...this.watches.keys()]) this.stopWatch(sessionId)
    return saved
  }

  // ---------------------------------------------------------------- reviews

  /** Subscribe to a running review's events; returns undefined when none runs. */
  follow(sessionId: string, listener: (event: ReviewStreamEvent) => void): (() => void) | undefined {
    const job = this.jobs.get(sessionId)
    if (job === undefined) return undefined
    job.listeners.add(listener)
    return () => job.listeners.delete(listener)
  }

  cancel(sessionId: string): boolean {
    const job = this.jobs.get(sessionId)
    if (job === undefined) return false
    job.controller.abort()
    return true
  }

  /**
   * Start a review. A manual review replaces a live one that is running; a
   * second manual review of the same conversation is refused.
   * @returns the finished report (rejects with ReviewError).
   */
  async start(request: ReviewRequest, trigger: ReviewTrigger = 'manual', listener?: (event: ReviewStreamEvent) => void, extras: ReviewExtras = {}): Promise<Report> {
    const sessionId = request.session
    const existing = this.jobs.get(sessionId)
    if (existing !== undefined) {
      if (existing.running.trigger === 'live' && trigger !== 'live') {
        existing.controller.abort()
        await existing.done.catch(() => undefined)
      } else {
        throw new ReviewError('这个对话正在审查中', 'busy')
      }
    }
    const session = this.faces.session(sessionId)
    if (session === undefined) throw new ReviewError('这个对话当前没有加载：请先在左边打开它', 'not-loaded')
    const llm = this.faces.llm()
    if (llm === undefined) throw new ReviewError('DSH 的模型服务不可用', 'no-llm')
    const found = await this.routeFor(sessionId, request.route)
    if (found === undefined) throw new ReviewError('没有可用的审查模型：请在面板里选一个', 'no-route')
    const route: ModelRoute = { provider: found.provider, model: found.model, ...(found.effort !== undefined ? { effort: found.effort } : {}) }
    const prompt = await this.promptFor(request.promptId ?? (await this.store.loadGlobal()).activePromptId)

    const controller = new AbortController()
    const job: Job = {
      running: { id: randomUUID(), trigger, startedAt: Date.now(), phase: '整理对话', text: '', tools: [] },
      controller,
      listeners: new Set(listener !== undefined ? [listener] : []),
      done: Promise.resolve(undefined as unknown as Report),
    }
    const emit = (event: ReviewStreamEvent): void => {
      if (event.type === 'phase') job.running.phase = event.phase
      else if (event.type === 'delta') job.running.text = (job.running.text + event.text).slice(-4000)
      else if (event.type === 'tool') job.running.tools.push(event.tool)
      for (const each of job.listeners) {
        try {
          each(event)
        } catch {
          // A broken listener (a closed socket) must not stop the review.
        }
      }
    }
    job.done = this.execute(sessionId, session, request, route, prompt, trigger, controller, emit, extras)
    this.jobs.set(sessionId, job)
    this.errors.delete(sessionId)
    try {
      const report = await job.done
      emit({ type: 'done', report })
      return report
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!(error instanceof ReviewError && error.code === 'cancelled')) this.errors.set(sessionId, message)
      emit({ type: 'error', message })
      throw error instanceof ReviewError ? error : new ReviewError(message)
    } finally {
      if (this.jobs.get(sessionId) === job) this.jobs.delete(sessionId)
    }
  }

  private async execute(
    sessionId: string,
    session: SessionFace,
    request: ReviewRequest,
    route: ModelRoute,
    prompt: ReviewPrompt,
    trigger: ReviewTrigger,
    controller: AbortController,
    emit: (event: ReviewStreamEvent) => void,
    extras: ReviewExtras,
  ): Promise<Report> {
    const started = Date.now()
    const scope = request.scope
    const content: ReviewContent = request.content ?? 'both'
    const events = session.snapshotEvents()
    const turns = turnsOf(events)
    if (turns.length === 0) throw new ReviewError('这个对话还没有内容可以审查', 'empty')
    const { selected, before } = selectTurns(turns, scope)
    if (selected.length === 0) throw new ReviewError(`没有${scopeLabel(scope)}可以审查（共 ${turns.length} 轮）`, 'empty')
    const notes: string[] = []
    const counts: Record<string, number> = {}
    const cwd = session.header?.cwd
    const budget = this.config.maxTranscriptChars

    // What the reviewer reads, by content.
    const files = content === 'conversation' ? [] : [...new Set([...(extras.extraFiles ?? []), ...touchedFiles(selected, cwd)])]
    let transcript: string | undefined
    let asks: string | undefined
    if (content !== 'files') {
      const fitted = fitTurns(selected, content === 'both' ? Math.floor(budget * 0.65) : budget)
      if (fitted.dropped > 0) notes.push(`对话过长，较早的 ${fitted.dropped} 轮没有发给审查模型`)
      else if (fitted.squeezed > 0) notes.push(`对话较长，较早的 ${fitted.squeezed} 轮做了压缩`)
      transcript = fitted.text
    } else {
      asks = renderBackground(selected, 8000) || '（这几轮里没有找到用户的文字要求）'
    }
    let filesText: string | undefined
    let shown: string[] = []
    let workspace: string | undefined
    let roots: string[] = []
    if (content !== 'conversation') {
      emit({ type: 'phase', phase: '读取生成的文件' })
      const section = await filesSection(files, content === 'files' ? Math.floor(budget * 0.75) : Math.floor(budget * 0.3))
      filesText = section.text
      shown = section.shown
      notes.push(...section.notes)
      roots = await reviewRoots(cwd, files)
      workspace = workspaceOverview(roots)
      if (roots.length > 1) notes.push(`查看了 ${roots.length} 个目录：${roots.join('、')}`)
    }
    const depth = content === 'conversation' ? 'quick' : request.depth
    if (content === 'conversation' && request.depth === 'deep') notes.push('只看对话时不查看文件，按快速模式审查')

    let previous = extras.previous
    let previousLabel = extras.previousLabel
    if (previous === undefined && trigger === 'live') {
      const last = (await this.store.load(sessionId)).reports.find((report) => report.trigger === 'live' && report.turns.to === selected[selected.length - 1]!.index)
      if (last !== undefined) previous = findingsDigest(last)
      previousLabel = undefined
    }
    const clean = (text: string | undefined): string | undefined => {
      if (text === undefined) return undefined
      const cleaned = redact(text)
      addCounts(counts, cleaned.counts)
      return cleaned.text
    }
    const promptText = userPrompt({
      scopeLabel: `${scopeLabel(scope)}（第 ${selected[0]!.index}–${selected[selected.length - 1]!.index} 轮，共 ${turns.length} 轮）`,
      background: clean(renderBackground(before)) ?? '',
      ...(transcript !== undefined ? { transcript: clean(transcript)! } : {}),
      ...(asks !== undefined ? { asks: clean(asks)! } : {}),
      ...(filesText !== undefined ? { files: clean(filesText)! } : {}),
      ...(workspace !== undefined ? { workspace: clean(workspace)! } : {}),
      ...(previous !== undefined ? { previous: clean(previous)! } : {}),
      ...(previousLabel !== undefined ? { previousLabel } : {}),
    })
    const working = this.sessionRoute(sessionId)
    if (working !== undefined && working.provider === route.provider && working.model === route.model) notes.push('审查模型和执行者是同一个模型，换一个不同的模型更容易发现问题')

    const out = await runReview({
      llm: this.faces.llm()!,
      route,
      depth,
      system: systemPrompt({ checks: prompt.text, depth, content, live: trigger === 'live', loop: extras.loop !== undefined && extras.loop.round > 1, maxToolCalls: this.config.maxToolCalls }),
      prompt: promptText,
      roots,
      ...(route.effort !== undefined ? { effort: route.effort } : {}),
      maxToolCalls: this.config.maxToolCalls,
      maxTokens: this.config.maxTokens,
      timeoutMs: depth === 'deep' ? this.config.deepTimeoutMs : this.config.timeoutMs,
      signal: controller.signal,
      onPhase: (phase) => emit({ type: 'phase', phase }),
      onDelta: (text) => emit({ type: 'delta', text }),
      onTool: (tool) => emit({ type: 'tool', tool }),
    })
    addCounts(counts, out.redactions)
    const note = redactionNote(counts)
    if (note !== undefined) notes.push(note)
    notes.push(...out.notes)
    const parsed = parseReview(out.text)
    if (parsed?.partial === true) notes.push('审查模型的回答被截断了，只保留了完整的部分')
    const report: Report = {
      id: randomUUID(),
      sessionId,
      createdAt: Date.now(),
      trigger,
      scope,
      content,
      promptName: prompt.name,
      ...(route.effort !== undefined ? { effort: route.effort } : {}),
      ...(extras.loop !== undefined ? { loop: extras.loop } : {}),
      ...(shown.length > 0 ? { files: shown } : {}),
      turns: { from: selected[0]!.index, to: selected[selected.length - 1]!.index },
      depth: request.depth,
      usedDepth: out.usedDepth,
      provider: route.provider,
      model: route.model,
      verdict: parsed?.verdict ?? 'doubt',
      summary: parsed?.summary ?? '审查模型的回答不是约定的格式，下面是原文。',
      findings: parsed?.findings ?? [],
      checked: parsed?.checked ?? [],
      tools: out.tools,
      ...(parsed === undefined || parsed.partial === true ? { raw: out.text.slice(0, 20_000) } : {}),
      notes,
      elapsedMs: Date.now() - started,
    }
    if (this.disposed) return report
    await this.store.addReport(report)
    return report
  }

  async dismiss(sessionId: string, reportId: string, index: number, dismissed: boolean): Promise<Report | undefined> {
    return this.store.updateReport(sessionId, reportId, (report) => ({
      ...report,
      findings: report.findings.map((item, i) => {
        if (i !== index) return item
        const { dismissed: _old, ...rest } = item
        return dismissed ? { ...rest, dismissed: true as const } : rest
      }),
    }))
  }

  remove(sessionId: string, reportId: string): Promise<boolean> {
    return this.store.removeReport(sessionId, reportId)
  }

  async exportMarkdown(sessionId: string, reportId: string): Promise<string | undefined> {
    const report = (await this.store.load(sessionId)).reports.find((item) => item.id === reportId)
    if (report === undefined) return undefined
    return reportMarkdown(report, { verdict: VERDICT_LABELS, severity: SEVERITY_LABELS, category: CATEGORY_LABELS, content: CONTENT_LABELS, scope: scopeLabel(report.scope) })
  }

  /** Put a message to the working agent: steering while it runs, a follow-up turn when it is idle. */
  private deliver(agent: AgentFace, text: string): SendResult['mode'] {
    const message = createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'sider-task-reviewer' } })
    const mode: SendResult['mode'] = agent.status === 'running' ? 'steer' : 'followup'
    if (mode === 'steer') agent.steer(message)
    else agent.followup(message)
    return mode
  }

  /** Send text to the working agent. Only ever called because the user pressed send. */
  async send(sessionId: string, text: string, reportId?: string): Promise<SendResult> {
    const agent = this.faces.agent(sessionId)
    if (agent === undefined) throw new ReviewError('这个对话当前没有加载：请先在左边打开它', 'not-loaded')
    const trimmed = text.trim()
    if (trimmed === '') throw new ReviewError('没有要发送的内容', 'empty')
    const mode = this.deliver(agent, trimmed)
    if (reportId !== undefined) await this.store.updateReport(sessionId, reportId, (report) => ({ ...report, sentAt: Date.now() }))
    return { mode }
  }

  // ---------------------------------------------------------------- continuous review

  /** Start a continuous review of a conversation. */
  async startLoop(request: LoopRequest): Promise<LoopState> {
    const sessionId = request.session
    const current = this.loops.get(sessionId)
    if (current !== undefined && ACTIVE_LOOP.has(current.state.status)) throw new ReviewError('这个对话已经在连续审查中', 'busy')
    if (this.jobs.has(sessionId) && this.jobs.get(sessionId)!.running.trigger !== 'live') throw new ReviewError('这个对话正在审查中', 'busy')
    if (this.faces.session(sessionId) === undefined || this.faces.agent(sessionId) === undefined) throw new ReviewError('这个对话当前没有加载：请先在左边打开它', 'not-loaded')
    const maxRounds = clampRounds(request.maxRounds)
    await this.setSettings(sessionId, { loopRounds: maxRounds, scope: request.scope, content: request.content, depth: request.depth })
    const run: LoopRun = {
      state: { id: randomUUID(), status: 'reviewing', round: 1, maxRounds, startedAt: Date.now(), rounds: [{ round: 1 }], message: '第 1 轮审查中' },
      request: { ...request, maxRounds },
      files: [],
    }
    this.loops.set(sessionId, run)
    void this.loopRound(sessionId, run)
    return { ...run.state }
  }

  /** Stop a continuous review (a review of it that is running is cancelled). */
  stopLoop(sessionId: string): LoopState | undefined {
    const run = this.loops.get(sessionId)
    if (run === undefined) return undefined
    if (ACTIVE_LOOP.has(run.state.status)) {
      if (run.timer !== undefined) clearTimeout(run.timer)
      const job = this.jobs.get(sessionId)
      if (job?.running.trigger === 'loop') job.controller.abort()
      this.finish(run, 'stopped', '已手动停止')
    }
    return { ...run.state }
  }

  private finish(run: LoopRun, status: LoopState['status'], message: string): void {
    if (!ACTIVE_LOOP.has(run.state.status)) return
    if (run.timer !== undefined) clearTimeout(run.timer)
    run.state.status = status
    run.state.message = message
    run.state.endedAt = Date.now()
    run.pending = undefined
  }

  private async loopRound(sessionId: string, run: LoopRun): Promise<void> {
    const round = run.state.round
    const session = this.faces.session(sessionId)
    if (session === undefined) return this.finish(run, 'failed', '对话不再加载')
    let scope: ReviewScope = run.request.scope
    if (round > 1) {
      // The turns the working agent took after the findings went out.
      const after = turnsOf(session.snapshotEvents()).filter((turn) => turn.startSeq > (run.sentSeq ?? Infinity))
      if (after.length === 0) return this.finish(run, 'failed', '主对话没有新的回复，无法继续审查')
      scope = { kind: 'range', from: after[0]!.index, to: after[after.length - 1]!.index }
    }
    run.state.status = 'reviewing'
    run.state.message = `第 ${round} 轮审查中`
    let report: Report
    try {
      report = await this.start(
        { session: sessionId, scope, depth: run.request.depth, content: run.request.content, ...(run.request.route !== undefined ? { route: run.request.route } : {}), ...(run.request.promptId !== undefined ? { promptId: run.request.promptId } : {}) },
        'loop',
        undefined,
        {
          loop: { id: run.state.id, round, max: run.state.maxRounds },
          extraFiles: run.files,
          ...(run.last !== undefined ? { previous: findingsDigest(run.last), previousLabel: '上一轮审查指出、已经发给执行者修改的问题（检查是否都改好了）' } : {}),
        },
      )
    } catch (error) {
      if (!ACTIVE_LOOP.has(run.state.status)) return
      return this.finish(run, error instanceof ReviewError && error.code === 'cancelled' ? 'stopped' : 'failed', `第 ${round} 轮审查没有完成：${error instanceof Error ? error.message : String(error)}`)
    }
    if (!ACTIVE_LOOP.has(run.state.status)) return
    run.last = report
    run.files = [...new Set([...run.files, ...(report.files ?? [])])]
    const open = openFindings(report)
    const entry = run.state.rounds.find((item) => item.round === round)
    if (entry !== undefined) {
      entry.reportId = report.id
      entry.verdict = report.verdict
      entry.open = open.length
    }
    if (report.verdict === 'pass') return this.finish(run, 'passed', `第 ${round} 轮审查通过`)
    if (round >= run.state.maxRounds) return this.finish(run, 'limit', `已审查 ${round} 轮，达到上限，仍有问题`)
    if (open.length === 0) return this.finish(run, 'passed', `第 ${round} 轮没有需要修改的问题`)
    run.pending = { text: messageFor(report, open, { round, max: run.state.maxRounds }), reportId: report.id }
    this.trySend(sessionId, run)
  }

  /** Send the pending findings when the working agent is idle; otherwise wait for its turn to end. */
  private trySend(sessionId: string, run: LoopRun): void {
    if (run.pending === undefined || !ACTIVE_LOOP.has(run.state.status)) return
    const agent = this.faces.agent(sessionId)
    const session = this.faces.session(sessionId)
    if (agent === undefined || session === undefined) return this.finish(run, 'failed', '对话不再加载，无法把问题发给主对话')
    if (agent.status === 'running') {
      run.state.status = 'sending'
      run.state.message = '主对话正在工作，等它这一轮结束再发问题'
      return
    }
    const events = session.snapshotEvents()
    run.sentSeq = events.length > 0 ? events[events.length - 1]!.seq : -1
    try {
      agent.followup(createUserMessage({ content: [{ type: 'text', text: run.pending.text }], source: { kind: 'sider-task-reviewer' } }))
    } catch (error) {
      return this.finish(run, 'failed', `问题没有发出去：${error instanceof Error ? error.message : String(error)}`)
    }
    const reportId = run.pending.reportId
    run.pending = undefined
    const entry = run.state.rounds.find((item) => item.round === run.state.round)
    if (entry !== undefined) entry.sentAt = Date.now()
    void this.store.updateReport(sessionId, reportId, (report) => ({ ...report, sentAt: Date.now() })).catch(() => undefined)
    run.state.status = 'waiting'
    run.state.message = `已把第 ${run.state.round} 轮的问题发给主对话，等它修改`
    if (run.timer !== undefined) clearTimeout(run.timer)
    run.timer = setTimeout(() => this.finish(run, 'failed', '等主对话修改超时'), this.config.loopWaitMs)
    run.timer.unref?.()
  }

  /** @returns whether a continuous review of this conversation was running (its events are not live review's). */
  private onLoopEvent(sessionId: string, type: string, seq: number, reason?: string): boolean {
    const run = this.loops.get(sessionId)
    if (run === undefined || !ACTIVE_LOOP.has(run.state.status)) return false
    if (type !== 'turn/end') return true
    if (run.state.status === 'sending') {
      setTimeout(() => this.trySend(sessionId, run), this.config.loopSettleMs)
      return true
    }
    if (run.state.status !== 'waiting' || seq <= (run.sentSeq ?? Infinity)) return true
    if (reason !== undefined && reason !== 'success' && reason !== 'completed' && reason !== 'stop' && reason !== 'done') {
      this.finish(run, 'stopped', `主对话这一轮没有正常结束（${reason}），连续审查已停止`)
      return true
    }
    setTimeout(() => {
      if (run.state.status !== 'waiting') return
      // The agent may have picked up another queued turn: wait for that one to end.
      if (this.faces.agent(sessionId)?.status === 'running') return
      if (run.timer !== undefined) clearTimeout(run.timer)
      run.state.round += 1
      run.state.rounds.push({ round: run.state.round })
      void this.loopRound(sessionId, run)
    }, this.config.loopSettleMs)
    return true
  }

  // ---------------------------------------------------------------- live review

  private stopWatch(sessionId: string): void {
    const watch = this.watches.get(sessionId)
    if (watch?.timer !== undefined) clearTimeout(watch.timer)
    this.watches.delete(sessionId)
  }

  /**
   * Feed one session event: continuous reviews move on when the working
   * agent's turn ends; conversations with live review on get a review of
   * their current turn (it never sends anything).
   */
  async onSessionEvent(sessionId: string, type: string, seq: number, reason?: string): Promise<void> {
    if (this.disposed) return
    const heard = this.heard.get(sessionId) ?? { count: 0, lastType: '', lastAt: 0 }
    this.heard.set(sessionId, { count: heard.count + 1, lastType: type, lastAt: Date.now() })
    if (this.onLoopEvent(sessionId, type, seq, reason)) return
    if (type !== 'turn/end' && type !== 'step/end') return
    const settings = await this.store.loadReview()
    if (!settings.live) {
      this.stopWatch(sessionId)
      return
    }
    // Live review is for the user's conversations, not the sessions sub-agents run for them.
    const header = this.faces.session(sessionId)?.header
    if (header?.origin === 'subagent' || (header?.delegationDepth ?? 0) > 0) return
    if (type === 'step/end' && (await this.store.loadGlobal()).liveTrigger !== 'step') return
    const watch = this.watches.get(sessionId) ?? { lastAt: 0, lastSeq: -1 }
    this.watches.set(sessionId, watch)
    if (watch.timer !== undefined) clearTimeout(watch.timer)
    const wait = type === 'turn/end' ? 800 : Math.max(this.config.liveDebounceMs, watch.lastAt + this.config.liveMinGapMs - Date.now())
    watch.timer = setTimeout(() => {
      watch.timer = undefined
      void this.liveReview(sessionId, seq, type === 'turn/end')
    }, wait)
  }

  private async liveReview(sessionId: string, seq: number, turnEnded: boolean): Promise<void> {
    const watch = this.watches.get(sessionId)
    if (watch === undefined || this.disposed) return
    if (seq <= watch.lastSeq) return
    const loop = this.loops.get(sessionId)
    if (loop !== undefined && ACTIVE_LOOP.has(loop.state.status)) return
    if (this.jobs.has(sessionId)) {
      // Try again once the running review is over, if this was the turn's end.
      if (turnEnded) {
        const job = this.jobs.get(sessionId)!
        void job.done.catch(() => undefined).then(() => this.liveReview(sessionId, seq, true))
      }
      return
    }
    const settings = await this.store.loadReview()
    if (!settings.live) return
    watch.lastSeq = seq
    watch.lastAt = Date.now()
    try {
      await this.start({ session: sessionId, scope: { kind: 'last' }, depth: settings.depth, content: settings.content, ...(settings.route !== undefined ? { route: settings.route } : {}) }, 'live')
    } catch {
      // Reported through state().error; live review never throws at the session.
    }
  }

  dispose(): void {
    this.disposed = true
    for (const job of this.jobs.values()) job.controller.abort()
    for (const sessionId of [...this.watches.keys()]) this.stopWatch(sessionId)
    for (const run of this.loops.values()) if (run.timer !== undefined) clearTimeout(run.timer)
  }
}
