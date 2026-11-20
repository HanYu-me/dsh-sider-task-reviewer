// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { resetReviewStates } from '../src/client/api'
import { ShieldButton } from '../src/client/ShieldButton'

const doubt = { id: 'r', sessionId: 'A', createdAt: 1, trigger: 'manual', scope: { kind: 'last' }, content: 'both', promptName: '标准审查', turns: { from: 1, to: 1 }, depth: 'quick', usedDepth: 'quick', provider: 'p', model: 'm', verdict: 'doubt', summary: '', findings: [{ severity: 'low', category: 'other', title: 't', detail: '', evidence: '', suggestion: '' }], checked: [], tools: [], notes: [], elapsedMs: 1 }
const base = { live: true, busy: false, turns: 1, settings: { live: false, depth: 'quick', scope: { kind: 'last' }, content: 'both', loopRounds: 5 }, global: { liveTrigger: 'turn', activePromptId: 'builtin-standard' } }

beforeEach(() => {
  resetReviewStates()
  vi.stubGlobal('fetch', async (input: string) => {
    const session = new URL(String(input), 'http://x').searchParams.get('session')
    const value = { ...base, sessionId: session, reports: session === 'A' ? [doubt] : [] }
    return new Response(JSON.stringify({ ok: true, value }), { status: 200 })
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('switching the shield to another conversation drops the first one’s dot', async () => {
  // turns: 1 here, so the review of turn 1 is about the latest turn.
  const view = render(<ShieldButton sessionId="A" />)
  await waitFor(() => expect(view.container.querySelector('.rv-shield-dot.is-doubt')).toBeTruthy())
  view.rerender(<ShieldButton sessionId="B" />)
  await new Promise((r) => setTimeout(r, 200))
  expect(view.container.querySelector('.rv-shield-dot')).toBeNull()
  view.rerender(<ShieldButton sessionId="A" />)
  await waitFor(() => expect(view.container.querySelector('.rv-shield-dot.is-doubt')).toBeTruthy())
})

it('the dot goes once the conversation has moved past the reviewed turn', async () => {
  vi.stubGlobal('fetch', async (input: string) => {
    const session = new URL(String(input), 'http://x').searchParams.get('session')
    // Reviewed turn 1; the conversation now has 2 turns.
    const value = { ...base, sessionId: session, turns: 2, reports: [doubt] }
    return new Response(JSON.stringify({ ok: true, value }), { status: 200 })
  })
  const view = render(<ShieldButton sessionId="A" />)
  await waitFor(() => expect(view.container.querySelector('.rv-shield-btn')!.getAttribute('title')).toContain('上次审查的是第 1 轮'))
  expect(view.container.querySelector('.rv-shield-dot')).toBeNull()
})
