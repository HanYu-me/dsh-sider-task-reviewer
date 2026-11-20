/**
 * The discussion with the reviewer about its reviews of this conversation,
 * laid out like the sidebar's side chat: the conversation fills the panel
 * (your messages in bubbles on the right, the reviewer's replies across the
 * width), a status line while it answers, and a rounded composer at the
 * bottom with the model and a round send button.
 *
 * The reviewer keeps one conversation per working conversation: every review
 * (the newest with the material it was given, older ones as conclusions) and
 * what was said here. A reply can go to the working model the same way a
 * finding does: into the input box, or sent directly. The reviewer only
 * reads; whatever needs doing is for the main conversation.
 * @module dsh-sider-task-reviewer/client/ChatView
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { VERDICT_LABELS, type ModelCatalog, type ReviewToolUse, type SessionState, type ThreadEntry } from '../shared/protocol'
import { api, refreshSoon } from './api'
import { composerOf, onComposers, putIntoComposer } from './compose'
import { ChatIcon, CopyIcon, InsertIcon, ResetIcon, SendIcon, ShieldIcon, StopIcon } from './icons'
import { Markdown } from './markdown'

function timeLabel(at: number): string {
  const date = new Date(at)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return date.toDateString() === new Date().toDateString() ? time : `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

function modelLabel(catalog: ModelCatalog | undefined, provider: string | undefined, model: string | undefined): string {
  if (model === undefined) return ''
  const group = catalog?.groups.find((item) => item.id === provider)
  return group?.models.find((item) => item.id === model)?.name ?? model
}

function useComposerReady(sessionId: string): boolean {
  const [ready, setReady] = useState(() => composerOf(sessionId) !== undefined)
  useEffect(() => {
    setReady(composerOf(sessionId) !== undefined)
    return onComposers(() => setReady(composerOf(sessionId) !== undefined))
  }, [sessionId])
  return ready
}

const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

/** A collapsible line, like the side chat's tool rows. */
function FoldRow({ label, meta, children }: { label: string; meta?: string; children: ReactNode }) {
  return (
    <details className="rv-sc-row">
      <summary className="rv-sc-line rv-sc-summary">
        <span className="rv-sc-chevron">
          <Chevron />
        </span>
        <span className="rv-sc-label">{label}</span>
        {meta !== undefined ? <span className="rv-sc-meta">{meta}</span> : null}
      </summary>
      <div className="rv-sc-body">{children}</div>
    </details>
  )
}

function ToolsRow({ tools }: { tools: readonly ReviewToolUse[] }) {
  if (tools.length === 0) return null
  return (
    <FoldRow label={`查看了 ${tools.length} 处`} meta={tools.map((tool) => tool.target).join(' · ')}>
      {tools.map((tool, i) => (
        <div key={i} className={'rv-sc-code' + (tool.ok ? '' : ' is-bad')}>
          {tool.name} {tool.target}
          {tool.ok ? '' : '（失败）'}
        </div>
      ))}
    </FoldRow>
  )
}

function ReplyActions({ text, sessionId, live, meta, onNote }: { text: string; sessionId: string; live: boolean; meta: string; onNote(text: string): void }) {
  const composerReady = useComposerReady(sessionId)
  return (
    <div className="rv-sc-actions">
      <button
        type="button"
        className="rv-sc-icon"
        aria-label="放进输入框"
        title={composerReady ? '放进输入框：接在已有内容下面，你改完自己发送' : '先在左边打开这个对话'}
        disabled={!composerReady}
        onClick={() => {
          if (putIntoComposer(sessionId, text)) onNote('已放进输入框：修改后按发送。')
        }}
      >
        <InsertIcon size={14} />
      </button>
      <button
        type="button"
        className="rv-sc-icon"
        aria-label="直接发送"
        title="直接发给主对话：它正在工作时作为插话，空闲时开始新一轮"
        disabled={!live}
        onClick={() => {
          if (!window.confirm('把这段回答直接发给主对话？')) return
          void api
            .send(sessionId, text)
            .then((result) => onNote(result.mode === 'steer' ? '已作为插话发给主对话。' : '已发给主对话，它会开始新一轮。'))
            .catch((error: unknown) => onNote(error instanceof Error ? error.message : String(error)))
        }}
      >
        <SendIcon size={14} />
      </button>
      <button
        type="button"
        className="rv-sc-icon"
        aria-label="复制"
        title="复制"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(
            () => onNote('已复制。'),
            () => onNote('复制失败。'),
          )
        }}
      >
        <CopyIcon size={14} />
      </button>
      <span className="rv-sc-spacer" />
      <span className="rv-sc-stamp">{meta}</span>
    </div>
  )
}

function Entry({ entry, state, sessionId, catalog, onNote, onOpenReport }: { entry: ThreadEntry; state: SessionState; sessionId: string; catalog: ModelCatalog | undefined; onNote(text: string): void; onOpenReport(reportId: string): void }) {
  if (entry.kind === 'review') {
    const report = state.reports.find((item) => item.id === entry.reportId)
    const open = report === undefined ? 0 : report.findings.filter((item) => item.dismissed !== true).length
    return (
      <button
        type="button"
        className="rv-sc-line rv-sc-review"
        disabled={report === undefined}
        aria-label={`审查 · ${entry.label}`}
        title={`${entry.label}${report === undefined ? '（报告已删除）' : '：点开看报告'}`}
        onClick={() => onOpenReport(entry.reportId)}
      >
        <span className="rv-sc-icon-sm">
          <ShieldIcon size={13} />
        </span>
        <span className="rv-sc-label">
          审查{entry.label.split(' · ')[0]}
          {report !== undefined ? ` · ${VERDICT_LABELS[report.verdict]}${open > 0 ? ` · ${open} 个问题` : ''}` : ' · 报告已删除'}
        </span>
        {report !== undefined ? <span className={`rv-dot is-${report.verdict}`} /> : null}
        <span className="rv-sc-meta">{timeLabel(entry.at)}</span>
      </button>
    )
  }
  if (entry.role === 'user') return <div className="rv-sc-user">{entry.text}</div>
  return (
    <div className="rv-sc-reply">
      {entry.tools !== undefined ? <ToolsRow tools={entry.tools} /> : null}
      <Markdown text={entry.text} />
      {entry.notes !== undefined && entry.notes.length > 0 ? (
        <FoldRow label={`备注 ${entry.notes.length} 条`}>
          {entry.notes.map((item, i) => (
            <div key={i} className="rv-sc-prose">
              {item}
            </div>
          ))}
        </FoldRow>
      ) : null}
      <ReplyActions text={entry.text} sessionId={sessionId} live={state.live} meta={`${modelLabel(catalog, entry.provider, entry.model)} · ${timeLabel(entry.at)}`} onNote={onNote} />
    </div>
  )
}

interface Pending {
  text: string
  reply: string
  phase: string
  tools: ReviewToolUse[]
}

export function ChatView({
  state,
  sessionId,
  catalog,
  modelName,
  onNote,
  onOpenReport,
  onPickModel,
}: {
  state: SessionState
  sessionId: string
  catalog: ModelCatalog | undefined
  modelName: string
  onNote(text: string): void
  onOpenReport(reportId: string): void
  onPickModel(): void
}) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Pending | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const scroller = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const entries = state.thread ?? []
  const busyElsewhere = pending === undefined && state.chatting !== undefined
  const busy = pending !== undefined || busyElsewhere

  // Follow the conversation to its end as it grows.
  useEffect(() => {
    const element = scroller.current
    if (element !== null) element.scrollTop = element.scrollHeight
  }, [entries.length, pending?.reply.length, pending !== undefined, failure])

  // The input grows with what is typed, up to a few lines.
  useLayoutEffect(() => {
    const element = box.current
    if (element === null) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(132, element.scrollHeight)}px`
  }, [draft])

  const send = (): void => {
    const text = draft.trim()
    if (text === '' || busy) return
    setFailure(undefined)
    setPending({ text, reply: '', phase: '等待审查模型', tools: [] })
    setDraft('')
    api
      .chat(sessionId, text, (event) => {
        setPending((current) => {
          if (current === undefined) return current
          if (event.type === 'phase') return { ...current, phase: event.phase }
          if (event.type === 'delta') return { ...current, reply: current.reply + event.text }
          if (event.type === 'tool') return { ...current, tools: [...current.tools, event.tool] }
          return current
        })
      })
      .catch((error: unknown) => {
        setFailure(error instanceof Error ? error.message : String(error))
        // Nothing was kept: give the text back to edit and send again.
        setDraft((current) => (current.trim() === '' ? text : current))
      })
      .finally(() => {
        setPending(undefined)
        refreshSoon(sessionId)
      })
  }

  const status = pending !== undefined ? pending.phase : busyElsewhere ? state.chatting!.phase : undefined

  return (
    <div className="rv-sc">
      <div className="rv-sc-scroll" ref={scroller} aria-label="和审查模型的讨论">
        {entries.length === 0 && pending === undefined ? (
          <div className="rv-sc-hero">
            <ChatIcon size={26} />
            <div className="rv-sc-hero-title">和审查 AI 讨论</div>
            <div className="rv-sc-hero-desc">它记得这个对话的每次审查（较早的只保留结论）和你们的讨论，以后的审查也会参考这里说的。它只读，不会改文件或运行命令。先在「审查」里审查一次，再来问它。</div>
          </div>
        ) : null}
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} state={state} sessionId={sessionId} catalog={catalog} onNote={onNote} onOpenReport={onOpenReport} />
        ))}
        {pending !== undefined ? (
          <>
            <div className="rv-sc-user">{pending.text}</div>
            {pending.tools.length > 0 || pending.reply !== '' ? (
              <div className="rv-sc-reply">
                <ToolsRow tools={pending.tools} />
                {pending.reply !== '' ? <Markdown text={pending.reply} /> : null}
              </div>
            ) : null}
          </>
        ) : null}
        {busyElsewhere && state.chatting!.text !== '' ? (
          <div className="rv-sc-reply">
            <Markdown text={state.chatting!.text} />
          </div>
        ) : null}
        {failure !== undefined ? <div className="rv-sc-error">没有得到回答：{failure}</div> : null}
      </div>

      {status !== undefined ? (
        <div className="rv-sc-status">
          <span className="rv-sc-shimmer">审查 AI 正在回答 · {status}</span>
        </div>
      ) : null}

      <div className="rv-sc-composer">
        <textarea
          ref={box}
          className="rv-sc-input"
          rows={1}
          value={draft}
          placeholder={entries.length > 0 ? '问审查 AI，比如：第 2 条为什么算问题？' : '问审查 AI…'}
          aria-label="对审查模型说"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <div className="rv-sc-bar">
          <button type="button" className="rv-sc-model" title="审查模型（在「审查」页里换）" onClick={onPickModel}>
            <span className="rv-sc-model-name">{modelName}</span>
          </button>
          <button
            type="button"
            className="rv-sc-icon"
            aria-label="重新开始"
            title="重新开始：清空审查 AI 对这个对话的记忆（审查报告会保留）"
            disabled={entries.length === 0 || busy}
            onClick={() => {
              if (!window.confirm('清空审查 AI 对这个对话的记忆？以后的审查从头开始，审查报告会保留。')) return
              void api
                .resetThread(sessionId)
                .then(() => onNote('已重新开始：审查 AI 不再记得之前的审查和讨论。'))
                .catch((error: unknown) => onNote(error instanceof Error ? error.message : String(error)))
                .finally(() => refreshSoon(sessionId))
            }}
          >
            <ResetIcon size={14} />
          </button>
          <span className="rv-sc-spacer" />
          {busy ? (
            <button type="button" className="rv-sc-send" aria-label="停止" title="停止回答" onClick={() => void api.cancelChat(sessionId).finally(() => refreshSoon(sessionId))}>
              <StopIcon size={11} />
            </button>
          ) : (
            <button type="button" className="rv-sc-send" aria-label="发送" title="发送（Enter）· Shift+Enter 换行" disabled={draft.trim() === ''} onClick={send}>
              <SendIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
