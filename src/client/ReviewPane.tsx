/**
 * The right-sidebar 「任务审查」 tab of one conversation:
 * - pick the reviewer and its reasoning effort, the scope, what to look at
 *   (conversation, files, or both), the depth and the review prompt;
 * - run one review, or a continuous review that sends the findings to the
 *   working model and reviews its fix until a review passes or the round
 *   limit is reached;
 * - read the findings with their evidence, hand them back (only on a press),
 *   look through the saved reviews;
 * - a second view is the discussion with the reviewer about its reviews of
 *   this conversation; a third edits the review prompts.
 * @module dsh-sider-task-reviewer/client/ReviewPane
 */
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CATEGORY_LABELS, CONTENT_LABELS, scopeLabel, SEVERITY_LABELS, VERDICT_LABELS } from '../shared/protocol'
import type { Finding, LoopState, ModelCatalog, ModelEfforts, ModelRoute, Report, ReviewContent, ReviewDepth, ReviewPrompt, ReviewScope, SessionState } from '../shared/protocol'
import { api, loadCatalog, loadEfforts, refreshSoon, useReviewState } from './api'
import { composerOf, messageFor, onComposers, openFindings, putIntoComposer } from './compose'
import { ChatIcon, CopyIcon, DownloadIcon, EyeOffIcon, GearIcon, InsertIcon, LoopIcon, PlayIcon, SendIcon, ShieldIcon, StopIcon, TrashIcon } from './icons'
import { ChatView } from './ChatView'
import { PromptsView } from './PromptsView'
import { onShowView, takeRequestedView, type PaneView } from './views'

const SEP = '\u0000'

function routeKey(route: ModelRoute | undefined): string {
  return route === undefined ? '' : `${route.provider}${SEP}${route.model}`
}

function routeFromKey(key: string): ModelRoute | undefined {
  const [provider, model] = key.split(SEP)
  return provider !== undefined && model !== undefined && provider !== '' && model !== '' ? { provider, model } : undefined
}

function modelName(catalog: ModelCatalog | undefined, route: ModelRoute | undefined): string {
  if (route === undefined) return '（未设置）'
  const group = catalog?.groups.find((item) => item.id === route.provider)
  const model = group?.models.find((item) => item.id === route.model)
  return model !== undefined ? `${model.name}${group !== undefined ? ` · ${group.name}` : ''}` : `${route.model} · ${route.provider}`
}

function timeLabel(at: number): string {
  const date = new Date(at)
  const today = new Date()
  const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  if (date.toDateString() === today.toDateString()) return hm
  return `${date.getMonth() + 1}/${date.getDate()} ${hm}`
}

function rangeLabel(report: Report): string {
  return report.turns.from === report.turns.to ? `第 ${report.turns.from} 轮` : `第 ${report.turns.from}–${report.turns.to} 轮`
}

function useComposerReady(sessionId: string): boolean {
  return useSyncExternalStore(onComposers, () => composerOf(sessionId) !== undefined)
}

function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

function useEfforts(route: ModelRoute | undefined): ModelEfforts | undefined {
  const [value, setValue] = useState<ModelEfforts | undefined>(undefined)
  const key = routeKey(route)
  useEffect(() => {
    setValue(undefined)
    if (route === undefined) return undefined
    let alive = true
    void loadEfforts(route).then((efforts) => alive && setValue(efforts))
    return () => {
      alive = false
    }
  }, [key])
  return value
}

function ModelSelect({ catalog, value, defaultLabel, label, onChange }: { catalog: ModelCatalog | undefined; value: ModelRoute | undefined; defaultLabel: string; label: string; onChange(route: ModelRoute | undefined): void }) {
  const key = routeKey(value)
  const known = catalog?.groups.some((group) => group.id === value?.provider && group.models.some((model) => model.id === value?.model)) ?? false
  return (
    <select className="rv-select" aria-label={label} value={key} onChange={(event) => onChange(routeFromKey(event.target.value))}>
      <option value="">{defaultLabel}</option>
      {value !== undefined && !known ? <option value={key}>{modelName(catalog, value)}</option> : null}
      {catalog?.groups.map((group) => (
        <optgroup key={group.id} label={group.name}>
          {group.models.map((model) => (
            <option key={model.id} value={`${group.id}${SEP}${model.id}`}>
              {model.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

/** The reasoning effort of the reviewer, for models that offer a choice. */
function EffortSelect({ efforts, value, label, onChange }: { efforts: ModelEfforts; value: string | undefined; label: string; onChange(effort: string | undefined): void }) {
  const fallback = efforts.efforts.find((item) => item.id === efforts.defaultEffort)
  return (
    <select className="rv-select" aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}>
      <option value="">{fallback !== undefined ? `模型默认（${fallback.name}）` : '模型默认'}</option>
      {efforts.efforts.map((item) => (
        <option key={item.id} value={item.id} title={item.description}>
          {item.name}
        </option>
      ))}
    </select>
  )
}

function Segmented<T extends string>({ value, options, label, onChange }: { value: T; options: { value: T; label: string; title?: string }[]; label: string; onChange(value: T): void }) {
  return (
    <div className="rv-seg" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value} className={option.value === value ? 'is-on' : ''} title={option.title} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

function FindingCard({ finding, index, report, sessionId, onNote }: { finding: Finding; index: number; report: Report; sessionId: string; onNote(text: string): void }) {
  const composerReady = useComposerReady(sessionId)
  const [busy, setBusy] = useState(false)
  const text = messageFor(report, [finding])
  return (
    <div className={`rv-finding is-${finding.severity}${finding.dismissed === true ? ' is-dismissed' : ''}`}>
      <div className="rv-finding-tags">
        <span className="rv-sev">{SEVERITY_LABELS[finding.severity]}</span>
        <span>{CATEGORY_LABELS[finding.category]}</span>
        {finding.dismissed === true ? <span>· 已忽略</span> : null}
      </div>
      <h4>{finding.title}</h4>
      {finding.detail !== '' ? <p>{finding.detail}</p> : null}
      {finding.evidence !== '' ? <code className="rv-evidence rv-mono">证据：{finding.evidence}</code> : null}
      {finding.suggestion !== '' ? (
        <p className="rv-suggest">
          <b>建议：</b>
          {finding.suggestion}
        </p>
      ) : null}
      <div className="rv-actions">
        <button
          type="button"
          className="rv-btn rv-btn-sm"
          disabled={!composerReady}
          title={composerReady ? '把这条问题放进这个对话的输入框，你可以修改后再发送' : '找不到这个对话的输入框'}
          onClick={() => {
            if (putIntoComposer(sessionId, text)) onNote('已放进输入框：修改后按发送，主模型才会收到。')
          }}
        >
          <InsertIcon /> 放进输入框
        </button>
        <button
          type="button"
          className="rv-btn rv-btn-sm"
          disabled={busy}
          title="直接发给主模型：任务进行中时作为插话，否则开始新一轮"
          onClick={() => {
            setBusy(true)
            api
              .send(sessionId, text, report.id)
              .then((result) => onNote(result.mode === 'steer' ? '已发给主模型（任务进行中，作为插话）。' : '已发给主模型（开始了新一轮）。'))
              .catch((error: unknown) => onNote(`没有发出去：${error instanceof Error ? error.message : String(error)}`))
              .finally(() => {
                setBusy(false)
                refreshSoon(sessionId)
              })
          }}
        >
          <SendIcon /> 直接发送
        </button>
        <button type="button" className="rv-btn rv-btn-sm rv-btn-ghost" title="复制这条问题" onClick={() => void navigator.clipboard?.writeText(text).then(() => onNote('已复制。'))}>
          <CopyIcon />
        </button>
        <button
          type="button"
          className="rv-btn rv-btn-sm rv-btn-ghost"
          title={finding.dismissed === true ? '恢复这条问题' : '忽略这条问题（不算进状态）'}
          onClick={() => void api.dismiss(sessionId, report.id, index, finding.dismissed !== true).finally(() => refreshSoon(sessionId))}
        >
          <EyeOffIcon /> {finding.dismissed === true ? '恢复' : '忽略'}
        </button>
      </div>
    </div>
  )
}

function ReportView({ report, sessionId, catalog, onNote, onDiscuss }: { report: Report; sessionId: string; catalog: ModelCatalog | undefined; onNote(text: string): void; onDiscuss?: () => void }) {
  const composerReady = useComposerReady(sessionId)
  const open = openFindings(report)
  const unreadable = report.raw !== undefined && report.findings.length === 0 && report.summary.startsWith('审查模型的回答不是约定的格式')
  return (
    <div className="rv-card" aria-label="审查报告">
      <div className="rv-report-head">
        <span className={`rv-verdict is-${report.verdict}`}>{VERDICT_LABELS[report.verdict]}</span>
        <span className="rv-meta">
          {rangeLabel(report)} · {CONTENT_LABELS[report.content ?? 'both']} · {report.usedDepth === 'deep' ? '深入' : '快速'}
          {report.trigger === 'live' ? ' · 实时' : ''}
          {report.loop !== undefined ? ` · 连续第 ${report.loop.round}/${report.loop.max} 轮` : ''} · {timeLabel(report.createdAt)}
        </span>
      </div>
      <p className="rv-summary">{report.summary || '（审查模型没有写总结）'}</p>
      <div className="rv-meta">
        {modelName(catalog, report)}
        {report.effort !== undefined ? ` · 思考 ${report.effort}` : ''} · {report.promptName ?? '标准审查'} · 用时 {Math.max(1, Math.round(report.elapsedMs / 1000))} 秒
        {report.sentAt !== undefined ? ' · 已发给主模型' : ''}
      </div>
      {report.findings.length > 0 ? (
        <div className="rv-findings">
          {report.findings.map((finding, index) => (
            <FindingCard key={index} finding={finding} index={index} report={report} sessionId={sessionId} onNote={onNote} />
          ))}
        </div>
      ) : null}
      {open.length > 1 ? (
        <div className="rv-actions" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="rv-btn rv-btn-sm"
            disabled={!composerReady}
            onClick={() => {
              if (putIntoComposer(sessionId, messageFor(report, open))) onNote(`已把 ${open.length} 条问题放进输入框：修改后按发送。`)
            }}
          >
            <InsertIcon /> 全部 {open.length} 条放进输入框
          </button>
        </div>
      ) : null}
      {report.checked.length > 0 ? (
        <details className="rv-details">
          <summary>核对过、没有问题（{report.checked.length}）</summary>
          <ul className="rv-list">
            {report.checked.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {report.files !== undefined && report.files.length > 0 ? (
        <details className="rv-details">
          <summary>审查的文件（{report.files.length}）</summary>
          <ul className="rv-list rv-mono">
            {report.files.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {report.tools.length > 0 ? (
        <details className="rv-details">
          <summary>审查时查看了（{report.tools.length}）</summary>
          <div className="rv-chips">
            {report.tools.map((tool, i) => (
              <span key={i} className={'rv-chip rv-mono' + (tool.ok ? '' : ' is-bad')} title={tool.target}>
                {tool.name} {tool.target}
              </span>
            ))}
          </div>
        </details>
      ) : null}
      {report.notes.length > 0 ? (
        <details className="rv-details">
          <summary>备注（{report.notes.length}）</summary>
          <ul className="rv-list">
            {report.notes.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {report.raw !== undefined && unreadable ? <pre className="rv-raw rv-mono">{report.raw}</pre> : null}
      {report.raw !== undefined && !unreadable ? (
        <details className="rv-details">
          <summary>审查模型原文</summary>
          <pre className="rv-raw rv-mono">{report.raw}</pre>
        </details>
      ) : null}
      {onDiscuss !== undefined ? (
        <div className="rv-actions" style={{ marginTop: 10 }}>
          <button type="button" className="rv-btn rv-btn-sm rv-grow" title="和审查模型讨论这次审查：它记得这次和之前的审查" onClick={onDiscuss}>
            <ChatIcon size={13} /> 和审查 AI 讨论
          </button>
        </div>
      ) : null}
      <div className="rv-actions" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="rv-btn rv-btn-sm rv-btn-ghost"
          onClick={() => {
            void api
              .exportMarkdown(sessionId, report.id)
              .then((markdown) => {
                const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
                const link = document.createElement('a')
                link.href = url
                link.download = `任务审查-${new Date(report.createdAt).toISOString().slice(0, 16).replace(/[T:]/g, '-')}.md`
                link.click()
                setTimeout(() => URL.revokeObjectURL(url), 5000)
              })
              .catch((error: unknown) => onNote(error instanceof Error ? error.message : String(error)))
          }}
        >
          <DownloadIcon /> 导出 Markdown
        </button>
        <button
          type="button"
          className="rv-btn rv-btn-sm rv-btn-ghost"
          onClick={() => {
            if (!window.confirm('删除这份审查报告？')) return
            void api.remove(sessionId, report.id).finally(() => refreshSoon(sessionId))
          }}
        >
          <TrashIcon /> 删除
        </button>
      </div>
    </div>
  )
}

function Running({ state }: { state: SessionState }) {
  const running = state.running
  const now = useTick(running !== undefined)
  if (running === undefined) return null
  return (
    <div className="rv-card rv-running" aria-live="off">
      <div className="rv-phase">
        <span className="rv-spinner" />
        <span className="rv-grow">
          {running.trigger === 'live' ? '实时审查：' : running.trigger === 'loop' ? '连续审查：' : ''}
          {running.phase}
        </span>
        <span className="rv-meta">{Math.max(0, Math.round((now - running.startedAt) / 1000))} 秒</span>
        {running.trigger !== 'loop' ? (
          <button type="button" className="rv-btn rv-btn-sm" onClick={() => void api.cancel(state.sessionId).finally(() => refreshSoon(state.sessionId))}>
            <StopIcon size={12} /> 取消
          </button>
        ) : null}
      </div>
      {running.tools.length > 0 ? (
        <div className="rv-chips">
          {running.tools.map((tool, i) => (
            <span key={i} className={'rv-chip rv-mono' + (tool.ok ? '' : ' is-bad')} title={tool.target}>
              {tool.name} {tool.target}
            </span>
          ))}
        </div>
      ) : null}
      {running.text !== '' ? <div className="rv-stream rv-mono">{running.text}</div> : null}
    </div>
  )
}

const LOOP_TITLES: Record<LoopState['status'], string> = {
  reviewing: '连续审查进行中',
  sending: '连续审查：等主对话空下来',
  waiting: '连续审查：等主对话修改',
  passed: '连续审查完成：没有问题了',
  limit: '连续审查结束：达到轮数上限',
  stopped: '连续审查已停止',
  failed: '连续审查中断',
}

/** Where a continuous review is: its rounds, what it waits for, a stop button. */
function LoopCard({ loop, sessionId, onPick }: { loop: LoopState; sessionId: string; onPick(reportId: string): void }) {
  const active = loop.status === 'reviewing' || loop.status === 'sending' || loop.status === 'waiting'
  const now = useTick(active)
  const tone = loop.status === 'passed' ? 'pass' : loop.status === 'limit' ? 'doubt' : loop.status === 'failed' ? 'fail' : active ? 'running' : 'idle'
  return (
    <div className={'rv-card rv-loop is-' + tone} aria-label="连续审查">
      <div className="rv-phase">
        {active ? <span className="rv-spinner" /> : <LoopIcon size={14} />}
        <span className="rv-grow">
          {LOOP_TITLES[loop.status]}
          <span className="rv-meta">
            {' '}
            · 第 {loop.round}/{loop.maxRounds} 轮 · {Math.max(0, Math.round(((loop.endedAt ?? now) - loop.startedAt) / 1000))} 秒
          </span>
        </span>
        {active ? (
          <button type="button" className="rv-btn rv-btn-sm" onClick={() => void api.stopLoop(sessionId).finally(() => refreshSoon(sessionId))}>
            <StopIcon size={12} /> 停止
          </button>
        ) : null}
      </div>
      {loop.message !== undefined ? (
        <div className="rv-hint" style={{ marginTop: 4 }}>
          {loop.message}
        </div>
      ) : null}
      <ol className="rv-rounds">
        {loop.rounds.map((round) => (
          <li key={round.round}>
            <span className={'rv-dot' + (round.verdict !== undefined ? ` is-${round.verdict}` : '')} />
            <span className="rv-grow">
              第 {round.round} 轮：
              {round.verdict === undefined ? '审查中…' : `${VERDICT_LABELS[round.verdict]}${round.open !== undefined && round.open > 0 ? ` · ${round.open} 个问题` : ''}${round.sentAt !== undefined ? ' · 已发给主对话' : ''}`}
            </span>
            {round.reportId !== undefined ? (
              <button type="button" className="rv-link" onClick={() => onPick(round.reportId!)}>
                看报告
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function SettingsSection({ state }: { state: SessionState }) {
  return (
    <div className="rv-card is-sunk" aria-label="审查设置">
      <div className="rv-row">
        <span className="rv-label">实时时机</span>
        <Segmented
          label="实时审查在什么时候进行"
          value={state.global.liveTrigger}
          options={[
            { value: 'turn', label: '每轮结束', title: '每轮任务结束后审查一次（推荐）' },
            { value: 'step', label: '轮中也审', title: '任务进行中，每步之后停顿片刻就审一次（更及时，也更费）' },
          ]}
          onChange={(liveTrigger) => void api.global({ liveTrigger }).finally(() => refreshSoon(state.sessionId))}
        />
      </div>
      <p className="rv-hint" style={{ margin: '8px 0 0' }}>
        审查时，对话记录、工具输出和生成的文件会发给你选的审查模型（可能是另一家服务商）。常见的密钥和 token 会先隐藏；.env、私钥等文件不会被读取。审查插件只读：不改文件、不运行命令，修改和运行都交给主会话。
      </p>
    </div>
  )
}

/** The tab body. */
export function ReviewPane({ sessionId }: { sessionId: string | undefined }) {
  const { state, error } = useReviewState(sessionId)
  const [catalog, setCatalog] = useState<ModelCatalog | undefined>(undefined)
  const [catalogError, setCatalogError] = useState<string | undefined>(undefined)
  const [prompts, setPrompts] = useState<ReviewPrompt[]>([])
  const [view, setView] = useState<PaneView>(() => takeRequestedView() ?? 'review')
  const [showSettings, setShowSettings] = useState(false)
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [startError, setStartError] = useState<string | undefined>(undefined)
  const [starting, setStarting] = useState(false)
  const [rounds, setRounds] = useState<string>('')

  const reloadPrompts = (): void => {
    void api.prompts().then(setPrompts).catch(() => undefined)
  }
  useEffect(() => {
    let alive = true
    loadCatalog()
      .then((value) => alive && setCatalog(value))
      .catch((reason: unknown) => alive && setCatalogError(reason instanceof Error ? reason.message : String(reason)))
    reloadPrompts()
    return () => {
      alive = false
    }
  }, [])
  // The shield's menu can ask for the discussion.
  useEffect(() => onShowView(setView), [])
  useEffect(() => {
    if (note === undefined) return undefined
    const timer = setTimeout(() => setNote(undefined), 6000)
    return () => clearTimeout(timer)
  }, [note])
  const route = state?.settings.route ?? state?.effectiveRoute
  const efforts = useEfforts(route === undefined ? undefined : { provider: route.provider, model: route.model })
  const shown = useMemo(() => state?.reports.find((item) => item.id === picked) ?? state?.reports[0], [state?.reports, picked])

  if (sessionId === undefined) {
    return (
      <div className="rv-root">
        <div className="rv-scroll">
          <div className="rv-empty">打开一个对话后，这里可以审查它做的事。</div>
        </div>
      </div>
    )
  }
  if (state === undefined) {
    return (
      <div className="rv-root">
        <div className="rv-scroll">{error !== undefined ? <div className="rv-banner is-error">{error}</div> : <div className="rv-empty">加载中…</div>}</div>
      </div>
    )
  }

  const settings = state.settings
  const turns = state.turns
  const scope: ReviewScope = settings.scope.kind === 'range' ? { kind: 'range', from: Math.min(settings.scope.from, Math.max(1, turns)), to: Math.min(settings.scope.to, Math.max(1, turns)) } : settings.scope
  const running = state.running !== undefined
  const loopActive = state.loop !== undefined && ['reviewing', 'sending', 'waiting'].includes(state.loop.status)
  const effective = state.effectiveRoute
  const fromLabel = effective === undefined ? '' : effective.from === 'harness' ? '跟随 DSH 默认' : effective.from === 'conversation' ? '和执行者相同' : ''
  const save = (patch: Parameters<typeof api.settings>[1]): void => {
    void api
      .settings(sessionId, patch)
      .catch((reason: unknown) => setNote(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => refreshSoon(sessionId))
  }
  const options = {
    scope,
    depth: settings.depth,
    content: settings.content,
    ...(settings.route !== undefined ? { route: settings.route } : {}),
  }
  const maxRounds = Math.min(20, Math.max(1, Number(rounds || settings.loopRounds) || 5))
  const startOnce = (): void => {
    setStartError(undefined)
    setStarting(true)
    setPicked(undefined)
    refreshSoon(sessionId)
    api
      .review(sessionId, options)
      .catch((reason: unknown) => setStartError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => {
        setStarting(false)
        refreshSoon(sessionId)
      })
  }
  const startLoop = (): void => {
    setStartError(undefined)
    setPicked(undefined)
    api
      .startLoop(sessionId, { ...options, maxRounds })
      .catch((reason: unknown) => setStartError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => refreshSoon(sessionId))
  }
  const promptName = (id: string | undefined): string => prompts.find((item) => item.id === id)?.name ?? '标准审查'
  const latest = state.reports[0]
  const header: ReactNode = running || loopActive ? <span className="rv-verdict is-running">{loopActive ? '连续审查中' : '审查中'}</span> : latest !== undefined ? <span className={`rv-verdict is-${latest.verdict}`}>{VERDICT_LABELS[latest.verdict]}</span> : null
  const blocked = running || loopActive || starting || !state.live || turns === 0

  return (
    <div className="rv-root">
      <div className="rv-scroll">
        <div className="rv-head">
          <ShieldIcon size={16} />
          <h2>任务审查</h2>
          {header}
          <span className="rv-spacer" />
          <div className="rv-views">
            <button type="button" aria-pressed={view === 'review'} className={view === 'review' ? 'is-on' : ''} onClick={() => setView('review')}>
              审查
            </button>
            <button type="button" aria-pressed={view === 'chat'} className={view === 'chat' ? 'is-on' : ''} onClick={() => setView('chat')}>
              讨论
            </button>
            <button type="button" aria-pressed={view === 'prompts'} className={view === 'prompts' ? 'is-on' : ''} onClick={() => setView('prompts')}>
              提示词
            </button>
          </div>
          <button type="button" className={'rv-icon-btn' + (showSettings ? ' is-on' : '')} aria-expanded={showSettings} aria-label="审查设置" title="审查设置" onClick={() => setShowSettings(!showSettings)}>
            <GearIcon />
          </button>
        </div>

        {showSettings ? <SettingsSection state={state} /> : null}

        {view === 'chat' ? (
          <>
            {note !== undefined ? <div className="rv-banner is-info">{note}</div> : null}
            <ChatView
              state={state}
              sessionId={sessionId}
              catalog={catalog}
              modelName={route !== undefined ? `${modelName(catalog, route)}${route.effort !== undefined ? ` · 思考 ${route.effort}` : ''}` : '跟随 DSH 默认'}
              onNote={setNote}
              onOpenReport={(reportId) => {
                setPicked(reportId)
                setView('review')
              }}
            />
          </>
        ) : view === 'prompts' ? (
          <PromptsView
            global={state.global}
            onChanged={() => {
              reloadPrompts()
              refreshSoon(sessionId)
            }}
          />
        ) : (
          <>
            {!state.live ? <div className="rv-banner is-info">这个对话现在没有在 DSH 里加载，只能看以前的报告。在左边打开它后就能审查。</div> : null}
            {catalogError !== undefined ? <div className="rv-banner is-error">读不到模型列表：{catalogError}</div> : null}

            <div className="rv-card" aria-label="开始审查">
              <div className="rv-row">
                <span className="rv-label">审查模型</span>
                <div className="rv-grow">
                  <ModelSelect
                    catalog={catalog}
                    value={settings.route}
                    label="审查模型"
                    defaultLabel={effective !== undefined && settings.route === undefined ? `${fromLabel !== '' ? fromLabel : '默认'}（${modelName(catalog, effective)}）` : '跟随 DSH 默认'}
                    onChange={(next) => save({ route: next ?? null })}
                  />
                </div>
              </div>
              {route !== undefined && efforts !== undefined && efforts.efforts.length > 0 ? (
                <div className="rv-row">
                  <span className="rv-label">思考强度</span>
                  <div className="rv-grow">
                    <EffortSelect
                      efforts={efforts}
                      value={route.effort}
                      label="审查模型的思考强度"
                      onChange={(effort) => save({ route: { provider: route.provider, model: route.model, ...(effort !== undefined ? { effort } : {}) } })}
                    />
                  </div>
                </div>
              ) : null}
              <div className="rv-row">
                <span className="rv-label">范围</span>
                <Segmented<ReviewScope['kind']>
                  label="审查范围"
                  value={scope.kind}
                  options={[
                    { value: 'last', label: '最后一轮' },
                    { value: 'all', label: '整个对话' },
                    { value: 'range', label: '指定轮次' },
                  ]}
                  onChange={(kind) => save({ scope: kind === 'range' ? { kind: 'range', from: Math.max(1, turns - 2), to: Math.max(1, turns) } : { kind } })}
                />
              </div>
              {scope.kind === 'range' ? (
                <div className="rv-row">
                  <span className="rv-label" />
                  <span className="rv-hint">第</span>
                  <input className="rv-num" type="number" min={1} max={Math.max(1, turns)} value={scope.from} aria-label="从第几轮" onChange={(event) => save({ scope: { kind: 'range', from: Math.max(1, Math.min(turns, Number(event.target.value) || 1)), to: scope.to } })} />
                  <span className="rv-hint">到</span>
                  <input className="rv-num" type="number" min={1} max={Math.max(1, turns)} value={scope.to} aria-label="到第几轮" onChange={(event) => save({ scope: { kind: 'range', from: scope.from, to: Math.max(1, Math.min(turns, Number(event.target.value) || 1)) } })} />
                  <span className="rv-hint">轮（共 {turns} 轮）</span>
                </div>
              ) : null}
              <div className="rv-row">
                <span className="rv-label">内容</span>
                <Segmented<ReviewContent>
                  label="审查内容"
                  value={settings.content}
                  options={[
                    { value: 'both', label: '对话和文件', title: '既核对对话里的说法，也检查生成的文件' },
                    { value: 'conversation', label: '只看对话', title: '只根据对话记录（含工具调用和结果）审查' },
                    { value: 'files', label: '只看文件', title: '只检查这几轮写出的文件是否符合要求' },
                  ]}
                  onChange={(content) => save({ content })}
                />
              </div>
              <div className="rv-row">
                <span className="rv-label">深度</span>
                <Segmented<ReviewDepth>
                  label="审查深度"
                  value={settings.depth}
                  options={[
                    { value: 'quick', label: '快速', title: '只看发过去的内容，不自己查看文件' },
                    { value: 'deep', label: '深入', title: '审查模型还可以读文件、列目录、搜索来核实（只读，不运行命令；更准，更慢）' },
                  ]}
                  onChange={(depth) => save({ depth })}
                />
                {settings.content === 'conversation' && settings.depth === 'deep' ? <span className="rv-hint">只看对话时按快速</span> : null}
              </div>
              <div className="rv-row">
                <span className="rv-label">提示词</span>
                <div className="rv-grow">
                  <select
                    className="rv-select"
                    aria-label="审查提示词"
                    value={state.global.activePromptId}
                    onChange={(event) => void api.global({ activePromptId: event.target.value }).catch((reason: unknown) => setNote(reason instanceof Error ? reason.message : String(reason))).finally(() => refreshSoon(sessionId))}
                  >
                    {prompts.length === 0 ? <option value={state.global.activePromptId}>{promptName(state.global.activePromptId)}</option> : null}
                    {prompts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="rv-link" onClick={() => setView('prompts')}>
                  管理
                </button>
              </div>
              <div className="rv-row" style={{ marginTop: 10 }}>
                <button type="button" className="rv-btn rv-btn-primary rv-grow" disabled={blocked} onClick={startOnce}>
                  <PlayIcon size={12} /> 审查{scopeLabel(scope)}
                </button>
              </div>
              <div className="rv-row">
                <button type="button" className="rv-btn rv-grow" disabled={blocked} title="审查 → 把问题自动发给主对话 → 主对话修改后再审查，直到没有问题或达到轮数" onClick={startLoop}>
                  <LoopIcon size={13} /> 连续审查
                </button>
                <span className="rv-hint">最多</span>
                <input
                  className="rv-num"
                  type="number"
                  min={1}
                  max={20}
                  value={rounds === '' ? String(settings.loopRounds) : rounds}
                  aria-label="连续审查最多几轮"
                  onChange={(event) => setRounds(event.target.value)}
                  onBlur={() => {
                    if (rounds !== '') save({ loopRounds: maxRounds })
                    setRounds('')
                  }}
                />
                <span className="rv-hint">轮</span>
              </div>
              <div className="rv-row" style={{ justifyContent: 'space-between' }}>
                <label className="rv-check" title="开启后，所有对话每轮任务结束时自动审查这一轮（子代理的会话除外）；只提示，不会打断主模型">
                  <input type="checkbox" checked={settings.live} onChange={(event) => save({ live: event.target.checked })} />
                  实时审查
                </label>
                <span className="rv-hint">
                  共 {turns} 轮{state.busy ? ' · 主模型正在工作' : ''}
                </span>
              </div>
            </div>

            <p className="rv-hint rv-shared-note">这些设置对所有对话通用。</p>

            {startError !== undefined ? <div className="rv-banner is-error">{startError}</div> : null}
            {state.error !== undefined && !running && startError === undefined ? <div className="rv-banner is-error">上次审查没有完成：{state.error}</div> : null}
            {note !== undefined ? <div className="rv-banner is-info">{note}</div> : null}

            {state.loop !== undefined ? <LoopCard loop={state.loop} sessionId={sessionId} onPick={setPicked} /> : null}
            <Running state={state} />

            {shown !== undefined ? (
              <ReportView report={shown} sessionId={sessionId} catalog={catalog} onNote={setNote} {...(shown.id === latest?.id ? { onDiscuss: () => setView('chat') } : {})} />
            ) : !running ? (
              <div className="rv-empty">
                <ShieldIcon size={30} />
                <p>还没有审查报告。选好范围和内容，点「审查」，另一个模型会核对这个对话做的事和写出的文件：说的和做的是否一致、有没有漏做、越界或危险的操作。</p>
              </div>
            ) : null}

            {state.reports.length > 1 ? (
              <>
                <div className="rv-section-title">以前的审查（{state.reports.length}）</div>
                <div className="rv-history">
                  {state.reports.map((report) => {
                    const open = openFindings(report).length
                    return (
                      <button key={report.id} type="button" className={'rv-hrow' + (report.id === shown?.id ? ' is-on' : '')} onClick={() => setPicked(report.id)}>
                        <span className={`rv-dot is-${report.verdict}`} />
                        <span className="rv-grow">
                          {rangeLabel(report)}
                          {report.trigger === 'live' ? ' · 实时' : report.loop !== undefined ? ` · 连续 ${report.loop.round}/${report.loop.max}` : ''} · {VERDICT_LABELS[report.verdict]}
                          {open > 0 ? ` · ${open} 个问题` : ''}
                        </span>
                        <span className="rv-meta">{timeLabel(report.createdAt)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
