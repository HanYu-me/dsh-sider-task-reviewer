import { describe, expect, it } from 'vitest'
import { chatSystemPrompt, NO_TOOLS, REVIEW_MARKER, systemPrompt } from '../src/prompt'

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

  it('tells a quick review and a discussion without tools not to use any (agent-style models have their own)', () => {
    expect(systemPrompt({ ...options, checks: '' })).toContain(NO_TOOLS)
    expect(systemPrompt({ ...options, depth: 'deep', checks: '' })).not.toContain(NO_TOOLS)
    expect(systemPrompt({ ...options, depth: 'deep', content: 'conversation', checks: '' })).toContain(NO_TOOLS)
    expect(chatSystemPrompt({ checks: '', tools: false, maxToolCalls: 8 })).toContain(NO_TOOLS)
    expect(chatSystemPrompt({ checks: '', tools: true, maxToolCalls: 8 })).not.toContain(NO_TOOLS)
    expect(chatSystemPrompt({ checks: '', tools: true, maxToolCalls: 8 })).toContain(REVIEW_MARKER)
  })

  it('names only read tools in deep mode', () => {
    const text = systemPrompt({ ...options, depth: 'deep', checks: '' })
    expect(text).toContain('read_file')
    expect(text).not.toMatch(/\bgit 运行/)
  })
})
