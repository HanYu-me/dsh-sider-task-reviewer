/**
 * The shield beside the composer.
 * - Left click: review the last turn (with the panel's model, content, depth
 *   and prompt, shared by every conversation) and, when it is done, put the
 *   suggestions into the input box (below anything already typed there) for
 *   the user to edit and send. A passing review puts nothing.
 * - Right click (or the context-menu key): a menu to start or stop a
 *   continuous review, switch live review, open the 「任务审查」 tab, or
 *   discuss the reviews with the reviewer.
 * The dot shows the review of the conversation's latest turn (green pass,
 * amber doubt, red problems, pulsing blue while reviewing); once the
 * conversation moves on past the reviewed turns, it goes away. The button also registers this
 * conversation's input box, so the panel can put findings into it.
 * @module dsh-sider-task-reviewer/client/ShieldButton
 */
import { useEffect, useRef, useState } from 'react'
import { messageFor, openFindings } from '../shared/message'
import { CONTENT_LABELS, scopeLabel, VERDICT_LABELS, type Report, type Verdict } from '../shared/protocol'
import { api, refreshSoon, useReviewState } from './api'
import { putIntoComposer, registerComposer, type ComposerActions } from './compose'
import { ChatIcon, LoopIcon, PanelIcon, PlayIcon, ShieldIcon, StopIcon } from './icons'
import { showView } from './views'

/** Open the 「任务审查」 tab of the on-screen conversation (set by the plugin entry). */
export const pane = { open: (): void => {} }

/** A report's state once findings the user waved away are left out. */
export function standingVerdict(report: Report): Verdict {
  if (report.findings.length === 0) return report.verdict
  const open = report.findings.filter((item) => item.dismissed !== true)
  if (open.some((item) => item.severity === 'high')) return report.verdict === 'pass' ? 'doubt' : report.verdict
  if (open.length === 0) return 'pass'
  return report.verdict === 'fail' && !open.some((item) => item.severity !== 'low') ? 'doubt' : report.verdict
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (event: PointerEvent): void => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, close])
  return ref
}

/** DSH's selector hook over the input box (`useInput(state => state.draft)`). */
type UseInput = (<S>(select: (state: { draft: string }) => S) => S | undefined) | undefined

export function ShieldButton({ sessionId, inputActions, useInput }: { sessionId: string; inputActions?: ComposerActions; useInput?: UseInput }) {
  const { state } = useReviewState(sessionId)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [working, setWorking] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  // The current draft, read on every render so "add below" sees what is typed now.
  const draft = useRef('')
  draft.current = (typeof useInput === 'function' ? useInput((input) => input.draft) : undefined) ?? ''

  useEffect(() => {
    if (inputActions === undefined || typeof inputActions.setDraft !== 'function') return undefined
    return registerComposer(sessionId, { setDraft: (text) => inputActions.setDraft(text), draft: () => draft.current })
  }, [sessionId, inputActions])
  useEffect(() => {
    if (message === undefined) return undefined
    const timer = setTimeout(() => setMessage(undefined), 8000)
    return () => clearTimeout(timer)
  }, [message])

  const latest = state?.reports[0]
  const loopActive = state?.loop !== undefined && ['reviewing', 'sending', 'waiting'].includes(state.loop.status)
  const running = working || state?.running !== undefined || loopActive
  // The dot is about the conversation as it is now: once it has moved past the reviewed turns, the old verdict no longer says anything.
  const current = latest !== undefined && state !== undefined && latest.turns.to >= state.turns
  const status = running ? 'running' : current ? standingVerdict(latest!) : undefined
  const settings = state?.settings
  const lastNote = latest === undefined ? '' : current ? `（最后一轮：${VERDICT_LABELS[standingVerdict(latest)]}）` : `（上次审查的是第 ${latest.turns.to} 轮，之后对话有了新内容）`
  const title = running ? '任务审查：正在审查（左键打开面板看进度，右键更多）' : `左键：审查最后一轮，建议放进输入框${lastNote}；右键：更多`
  // The shield always reviews the last turn; the rest comes from the panel.
  const lastTurn = settings === undefined ? undefined : { scope: { kind: 'last' } as const, depth: settings.depth, content: settings.content, ...(settings.route !== undefined ? { route: settings.route } : {}) }
  const loopOptions = settings === undefined ? undefined : { ...lastTurn!, scope: settings.scope }

  const reviewIntoComposer = (): void => {
    setOpen(false)
    if (running) {
      pane.open()
      return
    }
    if (lastTurn === undefined || state === undefined || state.turns === 0) return
    setWorking(true)
    setMessage('正在审查最后一轮…')
    refreshSoon(sessionId)
    void api
      .review(sessionId, lastTurn)
      .then((report) => {
        if (report === undefined) {
          setMessage('审查没有返回结果')
          return
        }
        const findings = openFindings(report)
        if (findings.length === 0) {
          setMessage(`审查${VERDICT_LABELS[report.verdict]}：没有需要修改的问题`)
          return
        }
        if (putIntoComposer(sessionId, messageFor(report, findings))) setMessage(`已把 ${findings.length} 条建议放进输入框，修改后按发送`)
        else setMessage(`审查${VERDICT_LABELS[report.verdict]}，但找不到输入框：请在审查面板里查看`)
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => {
        setWorking(false)
        refreshSoon(sessionId)
      })
  }

  const openMenu = (): void => setOpen(true)
  return (
    <div className="rv-shield" ref={ref}>
      <button
        type="button"
        className="rv-shield-btn"
        aria-label={title}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={reviewIntoComposer}
        onContextMenu={(event) => {
          event.preventDefault()
          openMenu()
        }}
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
            event.preventDefault()
            openMenu()
          }
        }}
      >
        <ShieldIcon size={17} />
        {status !== undefined ? <span className={`rv-shield-dot is-${status}`} /> : null}
      </button>
      {message !== undefined && !open ? <div className="rv-shield-note">{message}</div> : null}
      {open ? (
        <div className="rv-menu" role="menu" aria-label="任务审查">
          <button type="button" role="menuitem" className="rv-menu-item" disabled={running || state === undefined || state.turns === 0} onClick={reviewIntoComposer}>
            <PlayIcon size={12} /> 审查最后一轮，建议放进输入框
          </button>
          {loopActive ? (
            <button
              type="button"
              role="menuitem"
              className="rv-menu-item"
              onClick={() => {
                setOpen(false)
                void api.stopLoop(sessionId).finally(() => refreshSoon(sessionId))
              }}
            >
              <StopIcon size={12} /> 停止连续审查
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="rv-menu-item"
              disabled={running || loopOptions === undefined || state === undefined || state.turns === 0}
              onClick={() => {
                setOpen(false)
                if (loopOptions === undefined || settings === undefined) return
                pane.open()
                void api
                  .startLoop(sessionId, { ...loopOptions, maxRounds: settings.loopRounds })
                  .catch((error: unknown) => setMessage(error instanceof Error ? error.message : String(error)))
                  .finally(() => refreshSoon(sessionId))
              }}
            >
              <LoopIcon size={12} /> 连续审查{settings !== undefined ? `${scopeLabel(settings.scope)}（最多 ${settings.loopRounds} 轮）` : ''}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="rv-menu-item"
            onClick={() => {
              setOpen(false)
              pane.open()
            }}
          >
            <PanelIcon size={13} /> 打开审查面板
          </button>
          <button
            type="button"
            role="menuitem"
            className="rv-menu-item"
            onClick={() => {
              setOpen(false)
              showView('chat')
              pane.open()
            }}
          >
            <ChatIcon size={13} /> 和审查 AI 讨论
          </button>
          <div className="rv-menu-sep" />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={settings?.live === true}
            className="rv-menu-item"
            disabled={state === undefined}
            onClick={() => {
              if (state === undefined) return
              void api.settings(sessionId, { live: !state.settings.live }).finally(() => refreshSoon(sessionId))
            }}
          >
            <span style={{ width: 13, display: 'inline-block', textAlign: 'center' }}>{settings?.live === true ? '✓' : ''}</span> 实时审查（所有对话，每轮结束）
          </button>
          <div className="rv-menu-note">
            模型、内容、深度、提示词在审查面板里设置，对所有对话通用{settings !== undefined ? `（现在：${CONTENT_LABELS[settings.content]} · ${settings.depth === 'deep' ? '深入' : '快速'}）` : ''}
          </div>
        </div>
      ) : null}
    </div>
  )
}
