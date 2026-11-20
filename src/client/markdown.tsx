/**
 * A small Markdown reader for the reviewer's replies: paragraphs, headings,
 * lists, fenced code, **bold** and `code`. It builds React elements, never
 * HTML, so a reply cannot inject markup.
 * @module dsh-sider-task-reviewer/client/markdown
 */
import type { ReactNode } from 'react'

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g
  let last = 0
  let index = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const token = match[0]
    if (token.startsWith('**')) out.push(<strong key={`${key}-${index++}`}>{token.slice(2, -2)}</strong>)
    else out.push(<code key={`${key}-${index++}`}>{token.slice(1, -1)}</code>)
    last = at + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const BULLET = /^\s*[-*•]\s+/
const NUMBER = /^\s*\d+[.)、]\s+/
const HEADING = /^\s*#{1,6}\s+/

/** Render a reply. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | undefined
  const flushParagraph = (): void => {
    if (paragraph.length === 0) return
    const key = `p${blocks.length}`
    blocks.push(
      <p key={key}>
        {paragraph.flatMap((line, i) => (i === 0 ? inline(line, `${key}-${i}`) : [<br key={`${key}-br${i}`} />, ...inline(line, `${key}-${i}`)]))}
      </p>,
    )
    paragraph = []
  }
  const flushList = (): void => {
    if (list === undefined) return
    const key = `l${blocks.length}`
    const items = list.items.map((item, i) => <li key={`${key}-${i}`}>{inline(item, `${key}-${i}`)}</li>)
    blocks.push(list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>)
    list = undefined
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (/^\s*```/.test(line)) {
      flushParagraph()
      flushList()
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) code.push(lines[i++]!)
      blocks.push(
        <pre key={`c${blocks.length}`}>
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }
    if (HEADING.test(line)) {
      flushParagraph()
      flushList()
      blocks.push(<p key={`h${blocks.length}`} className="rv-md-h">{inline(line.replace(HEADING, ''), `h${blocks.length}`)}</p>)
      continue
    }
    const bullet = BULLET.test(line)
    const number = NUMBER.test(line)
    if (bullet || number) {
      flushParagraph()
      if (list !== undefined && list.ordered !== number) flushList()
      if (list === undefined) list = { ordered: number, items: [] }
      list.items.push(line.replace(bullet ? BULLET : NUMBER, ''))
      continue
    }
    if (list !== undefined && /^\s{2,}\S/.test(line)) {
      // A continuation of the last list item.
      list.items[list.items.length - 1] += ` ${line.trim()}`
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return <div className="rv-md">{blocks}</div>
}
