/**
 * The discussion with the reviewer about its reviews of this conversation.
 *
 * The reviewer keeps one conversation per working conversation: every review
 * (the newest with the material it was given, older ones as conclusions) and
 * what was said here. A reply can go to the working model the same way a
 * finding does: into the input box, or sent directly. The reviewer only
 * reads; whatever needs doing is for the main conversation.
 * @module dsh-sider-task-reviewer/client/ChatView
 */
import { useEffect, useRef, useState } from 'react'
import { VERDICT_LABELS, type ModelCatalog, type ReviewToolUse, type SessionState, type ThreadEntry } from '../shared/protocol'
import { api, refreshSoon } from './api'
import { composerOf, onComposers, putIntoComposer } from './compose'
import { ChatIcon, CopyIcon, InsertIcon, ResetIcon, SendIcon, StopIcon } from './icons'

function timeLabel(at: number): string {
  const date = new Date(at)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const today = new Date()
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return date.toDateString() === today.toDateString() ? time : `${date.getMonth() + 1}/${date.getDate()} ${time}`
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

function ToolChips({ tools }: { tools: readonly ReviewToolUse[] }) {
  if (tools.length === 0) return null
  return (
    <div className="rv-chips">
      {tools.map((tool, i) => (
        <span key={i} className={'rv-chip rv-mono' + (tool.ok ? '' : ' is-bad')} title={tool.target}>
          {tool.name} {tool.target}
        </span>
      ))}
    </div>
  )
}

function ReplyActions({ text, sessionId, live, onNote }: { text: string; sessionId: string; live: boolean; onNote(text: string): void }) {
  const composerReady = useComposerReady(sessionId)
  return (
    <div className="rv-chat-actions">
      <button
        type="button"
        className="rv-btn rv-btn-sm rv-btn-ghost"
        disabled={!composerReady}
        title={composerReady ? '接在输入框里已有内容的下面，你改完自己发送' : '先在左边打开这个对话'}
        onClick={() => {
          if (putIntoComposer(sessionId, text)) onNote('已放进输入框：修改后按发送。')
        }}
      >
        <InsertIcon /> 放进输入框
      </button>
      <button
        type="button"
        className="rv-btn rv-btn-sm rv-btn-ghost"
        disabled={!live}
        title="发给主对话：它正在工作时作为插话，空闲时开始新一轮"
        onClick={() => {
          if (!window.confirm('把这段回答直接发给主对话？')) return
          void api
            .send(sessionId, text)
            .then((result) => onNote(result.mode === 'steer' ? '已作为插话发给主对话。' : '已发给主对话，它会开始新一轮。'))
            .catch((error: unknown) => onNote(error instanceof Error ? error.message : String(error)))
        }}
      >
        <SendIcon /> 直接发送
      </button>
      <button
        type="button"
        className="rv-icon-btn"
        aria-label="复制"
        title="复制"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(
            () => onNote('已复制。'),
            () => onNote('复制失败。'),
          )
        }}
      >
        <CopyIcon />
      </button>
    </div>
  )
}

function Entry({ entry, state, sessionId, catalog, onNote, onOpenReport }: { entry: ThreadEntry; state: SessionState; sessionId: string; catalog: ModelCatalog | undefined; onNote(text: string): void; onOpenReport(reportId: string): void }) {
  if (entry.kind === 'review') {
    const report = state.reports.find((item) => item.id === entry.reportId)
    const open = report === undefined ? 0 : report.findings.filter((item) => item.dismissed !== true).length
    return (
      <button type="button" className="rv-chat-review" disabled={report === undefined} title={report === undefined ? '这份报告已删除' : '查看这份报告'} onClick={() => onOpenReport(entry.reportId)}>
        {report !== undefined ? <span className={`rv-dot is-${report.verdict}`} /> : null}
        <span className="rv-grow">
          审查 · {entry.label}
          {report !== undefined ? ` · ${VERDICT_LABELS[report.verdict]}${open > 0 ? ` · ${open} 个问题` : ''}` : ' · 报告已删除'}
        </span>
        <span className="rv-meta">{timeLabel(entry.at)}</span>
      </button>
    )
  }
  if (entry.role === 'user') {
    return (
      <div className="rv-chat-user">
        <div className="rv-chat-bubble">{entry.text}</div>
      </div>
    )
  }
  return (
    <div className="rv-chat-reply">
      <div className="rv-chat-text">{entry.text}</div>
      <div className="rv-meta">
        {modelLabel(catalog, entry.provider, entry.model)} · {timeLabel(entry.at)}
      </div>
      {entry.tools !== undefined && entry.tools.length > 0 ? (
        <details className="rv-details">
          <summary>查看了（{entry.tools.length}）</summary>
          <ToolChips tools={entry.tools} />
        </details>
      ) : null}
      {entry.notes !== undefined && entry.notes.length > 0 ? (
        <details className="rv-details">
          <summary>备注（{entry.notes.length}）</summary>
          <ul className="rv-list">
            {entry.notes.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <ReplyActions text={entry.text} sessionId={sessionId} live={state.live} onNote={onNote} />
    </div>
  )
}

interface Pending {
  text: string
  reply: string
  phase: string
  tools: ReviewToolUse[]
}

export function ChatView({ state, sessionId, catalog, modelName, onNote, onOpenReport }: { state: SessionState; sessionId: string; catalog: ModelCatalog | undefined; modelName: string; onNote(text: string): void; onOpenReport(reportId: string): void }) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Pending | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const end = useRef<HTMLDivElement>(null)
  const entries = state.thread ?? []
  const busyElsewhere = pending === undefined && state.chatting !== undefined

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [entries.length, pending?.reply.length, pending !== undefined])

  const send = (): void => {
    const text = draft.trim()
    if (text === '' || pending !== undefined || busyElsewhere) return
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

  return (
    <div className="rv-chat">
      <div className="rv-chat-intro">
        <p className="rv-hint">
          和审查模型讨论它对这个对话的审查。它记得这个对话的每次审查（较早的只保留结论）和你们的讨论，以后的审查也会参考这里说的。它只读，不会改文件或运行命令。
        </p>
        <div className="rv-row" style={{ justifyContent: 'space-between', minHeight: 0 }}>
          <span className="rv-meta">用 {modelName}（在「审查」里换）</span>
          <button
            type="button"
            className="rv-btn rv-btn-sm rv-btn-ghost"
            disabled={entries.length === 0 || pending !== undefined}
            title="清空审查模型对这个对话的记忆（审查报告会保留）"
            onClick={() => {
              if (!window.confirm('清空审查模型对这个对话的记忆？以后的审查从头开始，审查报告会保留。')) return
              void api
                .resetThread(sessionId)
                .then(() => onNote('已重新开始：审查模型不再记得之前的审查和讨论。'))
                .catch((error: unknown) => onNote(error instanceof Error ? error.message : String(error)))
                .finally(() => refreshSoon(sessionId))
            }}
          >
            <ResetIcon /> 重新开始
          </button>
        </div>
      </div>

      {entries.length === 0 && pending === undefined ? (
        <div className="rv-empty">
          <ChatIcon size={28} />
          <p>还没有审查记录。先在「审查」里审查一次，再来这里讨论它的结论；也可以直接提问。</p>
        </div>
      ) : null}

      <div className="rv-chat-list" aria-label="和审查模型的讨论">
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} state={state} sessionId={sessionId} catalog={catalog} onNote={onNote} onOpenReport={onOpenReport} />
        ))}
        {pending !== undefined ? (
          <>
            <div className="rv-chat-user">
              <div className="rv-chat-bubble">{pending.text}</div>
            </div>
            <div className="rv-chat-reply is-pending">
              {pending.reply !== '' ? <div className="rv-chat-text">{pending.reply}</div> : null}
              <div className="rv-phase">
                <span className="rv-spinner" aria-hidden="true" /> {pending.phase}
              </div>
              <ToolChips tools={pending.tools} />
            </div>
          </>
        ) : null}
        {busyElsewhere ? (
          <div className="rv-chat-reply is-pending">
            {state.chatting!.text !== '' ? <div className="rv-chat-text">{state.chatting!.text}</div> : null}
            <div className="rv-phase">
              <span className="rv-spinner" aria-hidden="true" /> 审查模型正在回答：{state.chatting!.phase}
            </div>
          </div>
        ) : null}
        <div ref={end} />
      </div>

      {failure !== undefined ? <div className="rv-banner is-error">没有得到回答：{failure}</div> : null}

      <div className="rv-chat-compose">
        <textarea
          className="rv-textarea"
          rows={3}
          value={draft}
          placeholder={entries.length > 0 ? '问审查模型，比如：第 2 条为什么算问题？' : '问审查模型…'}
          aria-label="对审查模型说"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <div className="rv-row" style={{ justifyContent: 'space-between' }}>
          <span className="rv-hint">Enter 发送 · Shift+Enter 换行</span>
          {pending !== undefined || busyElsewhere ? (
            <button type="button" className="rv-btn rv-btn-sm" onClick={() => void api.cancelChat(sessionId).finally(() => refreshSoon(sessionId))}>
              <StopIcon size={11} /> 停止
            </button>
          ) : (
            <button type="button" className="rv-btn rv-btn-sm rv-btn-primary" disabled={draft.trim() === ''} onClick={send}>
              <SendIcon /> 发送
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
