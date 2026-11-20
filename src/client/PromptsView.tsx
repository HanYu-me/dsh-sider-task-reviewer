/**
 * The review prompts, in the sidebar: pick the one reviews use, edit the
 * built-in one (and put it back), add your own, delete your own. A prompt
 * only says what to check; the plugin adds what is being looked at, the tools
 * and the answer format, so an edited prompt cannot break the reading of the
 * answer.
 * @module dsh-sider-task-reviewer/client/PromptsView
 */
import { useEffect, useState } from 'react'
import { BUILTIN_PROMPT_ID, type GlobalSettings, type ReviewPrompt } from '../shared/protocol'
import { api } from './api'

export function PromptsView({ global, onChanged }: { global: GlobalSettings; onChanged(): void }) {
  const [prompts, setPrompts] = useState<ReviewPrompt[] | undefined>(undefined)
  const [editing, setEditing] = useState<string | undefined>(undefined)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [note, setNote] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const load = (select?: string): void => {
    void api.prompts().then((list) => {
      setPrompts(list)
      const pick = list.find((item) => item.id === (select ?? editing)) ?? list.find((item) => item.id === global.activePromptId) ?? list[0]
      if (pick !== undefined) {
        setEditing(pick.id)
        setName(pick.name)
        setText(pick.text)
      }
    }).catch((error: unknown) => setNote(error instanceof Error ? error.message : String(error)))
  }
  useEffect(() => load(), [])
  useEffect(() => {
    if (note === undefined) return undefined
    const timer = setTimeout(() => setNote(undefined), 5000)
    return () => clearTimeout(timer)
  }, [note])

  if (prompts === undefined) return <div className="rv-empty">加载中…</div>
  const current = prompts.find((item) => item.id === editing)
  const isNew = editing === 'new'
  const dirty = isNew || (current !== undefined && (current.name !== name || current.text !== text))
  const pick = (item: ReviewPrompt): void => {
    if (dirty && !window.confirm('有没保存的修改，放弃吗？')) return
    setEditing(item.id)
    setName(item.name)
    setText(item.text)
  }
  const run = (task: () => Promise<void>): void => {
    setBusy(true)
    task()
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false))
  }

  return (
    <div>
      <p className="rv-hint" style={{ margin: '0 0 10px' }}>
        提示词决定审查模型检查什么、怎么判断。这里只写审查要求；审查的对象说明、只读工具说明和结论的 JSON 格式由插件自动加上，不用写。
      </p>
      <div className="rv-card" aria-label="提示词列表">
        <div className="rv-prompt-list">
          {prompts.map((item) => (
            <div key={item.id} className={'rv-prompt-row' + (item.id === editing ? ' is-on' : '')}>
              <button type="button" className="rv-prompt-name" onClick={() => pick(item)}>
                {item.name}
                {item.builtin === true ? <span className="rv-tag">{item.edited === true ? '内置 · 已修改' : '内置'}</span> : null}
              </button>
              {item.id === global.activePromptId ? (
                <span className="rv-tag is-on">使用中</span>
              ) : (
                <button type="button" className="rv-link" onClick={() => run(async () => { await api.global({ activePromptId: item.id }); onChanged(); setNote(`以后的审查默认用「${item.name}」`) })}>
                  设为默认
                </button>
              )}
            </div>
          ))}
          {isNew ? (
            <div className="rv-prompt-row is-on">
              <span className="rv-prompt-name">（新提示词，未保存）</span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="rv-btn rv-btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => {
            if (dirty && !window.confirm('有没保存的修改，放弃吗？')) return
            const base = prompts.find((item) => item.id === BUILTIN_PROMPT_ID)
            setEditing('new')
            setName('新提示词')
            setText(base?.text ?? '')
          }}
        >
          ＋ 新建提示词
        </button>
      </div>

      <div className="rv-card" aria-label="编辑提示词">
        <div className="rv-row">
          <span className="rv-label">名字</span>
          <input className="rv-input rv-grow" value={name} maxLength={40} aria-label="提示词名字" onChange={(event) => setName(event.target.value)} />
        </div>
        <textarea className="rv-textarea rv-mono" value={text} rows={16} aria-label="提示词内容" spellCheck={false} onChange={(event) => setText(event.target.value)} />
        <div className="rv-actions" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="rv-btn rv-btn-sm rv-btn-primary"
            disabled={busy || !dirty || name.trim() === '' || text.trim() === ''}
            onClick={() =>
              run(async () => {
                const saved = await api.savePrompt({ ...(isNew ? {} : { id: editing! }), name, text })
                setNote(isNew ? `已新建「${name.trim()}」` : '已保存')
                onChanged()
                load(saved.id)
              })
            }
          >
            保存
          </button>
          {!isNew ? (
            <button
              type="button"
              className="rv-btn rv-btn-sm"
              disabled={busy || name.trim() === '' || text.trim() === ''}
              title="不改动当前这个，另存一份新的"
              onClick={() =>
                run(async () => {
                  const saved = await api.savePrompt({ name: `${name.trim()} 副本`.slice(0, 40), text })
                  setNote('已另存为新提示词')
                  onChanged()
                  load(saved.id)
                })
              }
            >
              另存为新的
            </button>
          ) : null}
          {current?.builtin === true && current.edited === true ? (
            <button
              type="button"
              className="rv-btn rv-btn-sm rv-btn-ghost"
              onClick={() => {
                if (!window.confirm(`把「${current.name}」恢复成插件自带的版本？`)) return
                run(async () => {
                  await api.deletePrompt(current.id)
                  setNote(`已恢复「${current.name}」的原始内容`)
                  onChanged()
                  load(current.id)
                })
              }}
            >
              恢复默认
            </button>
          ) : null}
          {current !== undefined && current.builtin !== true && !isNew ? (
            <button
              type="button"
              className="rv-btn rv-btn-sm rv-btn-ghost"
              onClick={() => {
                if (!window.confirm(`删除提示词「${current.name}」？`)) return
                run(async () => {
                  await api.deletePrompt(current.id)
                  setNote('已删除')
                  onChanged()
                  load(BUILTIN_PROMPT_ID)
                })
              }}
            >
              删除
            </button>
          ) : null}
          {isNew ? (
            <button type="button" className="rv-btn rv-btn-sm rv-btn-ghost" onClick={() => load(global.activePromptId)}>
              取消
            </button>
          ) : null}
        </div>
      </div>
      {note !== undefined ? <div className="rv-banner is-info">{note}</div> : null}
    </div>
  )
}
