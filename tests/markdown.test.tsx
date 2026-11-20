// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Markdown } from '../src/client/markdown'

afterEach(cleanup)

describe('the reply reader', () => {
  it('shows bold, code, lists, headings and code blocks', () => {
    const { container } = render(<Markdown text={'## 结论\n第 **76** 轮，`pass`。\n\n1. 第一条\n2. 第二条\n\n- 甲\n- 乙\n\n```\nnpm test\n```'} />)
    expect(container.querySelector('.rv-md-h')?.textContent).toBe('结论')
    expect(container.querySelector('strong')?.textContent).toBe('76')
    expect(container.querySelector('p code')?.textContent).toBe('pass')
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(container.querySelectorAll('ul li')).toHaveLength(2)
    expect(container.querySelector('pre code')?.textContent).toBe('npm test')
  })

  it('never turns text into markup', () => {
    const { container } = render(<Markdown text={'<img src=x onerror=alert(1)> **<b>粗</b>**'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })
})
