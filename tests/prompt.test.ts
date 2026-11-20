import { describe, expect, it } from 'vitest'
import { REVIEW_MARKER, systemPrompt } from '../src/prompt'

describe('systemPrompt', () => {
  const options = { depth: 'quick' as const, content: 'both' as const, live: false, loop: false, maxToolCalls: 12 }

  it('always carries the review marker and the read-only rule, even with a prompt the user wrote', () => {
    for (const checks of ['', '只检查拼写。']) {
      const text = systemPrompt({ ...options, checks })
      expect(text).toContain(REVIEW_MARKER)
      expect(text).toContain('不能运行任何命令')
      expect(text).toContain('"verdict"')
    }
    expect(REVIEW_MARKER).toBe('REVIEW_POLICY')
  })

  it('names only read tools in deep mode', () => {
    const text = systemPrompt({ ...options, depth: 'deep', checks: '' })
    expect(text).toContain('read_file')
    expect(text).not.toMatch(/\bgit 运行/)
  })
})
