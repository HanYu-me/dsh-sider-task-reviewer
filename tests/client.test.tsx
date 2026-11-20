// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetReviewStates } from '../src/client/api'
import { putIntoComposer, registerComposer } from '../src/client/compose'
import { ReviewPane } from '../src/client/ReviewPane'
import { ShieldButton, standingVerdict } from '../src/client/ShieldButton'
import { CSS, ensureStyles } from '../src/client/styles'
import type { Report, SessionState } from '../src/shared/protocol'

const report: Report = {
  id: 'r1',
  sessionId: 's1',
  createdAt: Date.now(),
  trigger: 'manual',
  scope: { kind: 'last' },
  content: 'both',
  promptName: '标准审查',
  turns: { from: 3, to: 3 },
  depth: 'deep',
  usedDepth: 'deep',
  provider: 'p1',
  model: 'm1',
  verdict: 'fail',
  summary: '说测试通过，但测试失败了。',
  findings: [
    { severity: 'high', category: 'claim', title: '测试没有通过', detail: 'npm test 输出 2 failed', evidence: '第 3 轮 · 第 2 步 · bash', suggestion: '修复失败的测试' },
    { severity: 'low', category: 'scope', title: '顺手改了 README', detail: '', evidence: 'README.md', suggestion: '' },
  ],
  checked: ['没有危险操作'],
  tools: [{ name: 'read_file', target: 'src/a.ts', ok: true }],
  files: ['/w/src/a.ts'],
  notes: [],
  elapsedMs: 42_000,
}

function state(over: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: 's1',
    live: true,
    busy: false,
    turns: 3,
    settings: { live: false, depth: 'quick', scope: { kind: 'last' }, content: 'both', loopRounds: 5 },
    global: { liveTrigger: 'turn', activePromptId: 'builtin-standard' },
    effectiveRoute: { provider: 'p1', model: 'm1', from: 'harness' },
    reports: [report],
    ...over,
  }
}

let current: SessionState
let reviewAnswer: Report | undefined
const posts: Array<{ path: string; body: Record<string, unknown> }> = []
const prompts = [
  { id: 'builtin-standard', name: '标准审查', text: '内置要求', builtin: true },
  { id: 'p-1', name: '只看安全', text: '只检查危险操作' },
]

beforeEach(() => {
  current = state()
  reviewAnswer = report
  posts.length = 0
  resetReviewStates()
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const path = String(input).replace('/sider-task-reviewer', '')
    const bare = path.split('?')[0]!
    if (init?.method === 'POST') posts.push({ path: bare, body: JSON.parse(String(init.body)) as Record<string, unknown> })
    if (bare === '/review') return new Response(`data: ${JSON.stringify({ type: 'done', report: reviewAnswer })}\n\n`, { status: 200, headers: { 'content-type': 'text/event-stream' } })
    const value =
      bare === '/state' ? current
      : bare === '/models' ? { groups: [{ id: 'p1', name: 'P One', models: [{ id: 'm1', name: 'Model One' }] }] }
      : bare === '/efforts' ? { efforts: [{ id: 'low', name: '低' }, { id: 'high', name: '高' }], defaultEffort: 'low' }
      : bare === '/prompts' ? prompts
      : bare === '/prompt' ? { prompts, id: 'p-2' }
      : bare === '/send' ? { mode: 'followup' }
      : bare === '/loop/start' ? { id: 'L', status: 'reviewing', round: 1, maxRounds: 3, startedAt: Date.now(), rounds: [{ round: 1 }] }
      : true
    return new Response(JSON.stringify({ ok: true, value }), { status: 200 })
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const marks = (root: ParentNode): number => root.querySelectorAll('[role="dialog"], [aria-haspopup="dialog"], [role="status"][aria-live="polite"], [role="switch"], [role="tab"]').length
const lastPost = (path: string) => [...posts].reverse().find((post) => post.path === path)

describe('the review pane', () => {
  it('shows the latest report with its findings, evidence, files and what was checked', async () => {
    const { container } = render(<ReviewPane sessionId="s1" />)
    await screen.findByText('说测试通过，但测试失败了。')
    expect(screen.getByText('测试没有通过')).toBeTruthy()
    expect(screen.getByText('证据：第 3 轮 · 第 2 步 · bash')).toBeTruthy()
    expect(container.querySelector('.rv-verdict.is-fail')?.textContent).toBe('有问题')
    expect(screen.getByText('审查的文件（1）')).toBeTruthy()
    expect(screen.getByText('核对过、没有问题（1）')).toBeTruthy()
    expect(marks(container)).toBe(0)
  })

  it('offers the reasoning effort of the reviewer and saves it with the model', async () => {
    render(<ReviewPane sessionId="s1" />)
    const effort = await screen.findByRole('combobox', { name: '审查模型的思考强度' })
    expect(within(effort).getByRole('option', { name: '模型默认（低）' })).toBeTruthy()
    fireEvent.change(effort, { target: { value: 'high' } })
    await waitFor(() => expect(lastPost('/settings')?.body).toEqual({ session: 's1', route: { provider: 'p1', model: 'm1', effort: 'high' } }))
  })

  it('saves what to look at, the scope and the prompt, and reviews with them', async () => {
    current = state({ settings: { live: false, depth: 'deep', scope: { kind: 'all' }, content: 'files', loopRounds: 5 } })
    render(<ReviewPane sessionId="s1" />)
    await screen.findByText('测试没有通过')
    fireEvent.click(screen.getByRole('radio', { name: '只看对话' }))
    await waitFor(() => expect(lastPost('/settings')?.body).toEqual({ session: 's1', content: 'conversation' }))
    fireEvent.click(screen.getByRole('radio', { name: '指定轮次' }))
    await waitFor(() => expect(lastPost('/settings')?.body).toEqual({ session: 's1', scope: { kind: 'range', from: 1, to: 3 } }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /审查整个对话/ }))
    })
    await waitFor(() => expect(lastPost('/review')).toBeTruthy())
    expect(lastPost('/review')!.body).toEqual({ session: 's1', scope: { kind: 'all' }, depth: 'deep', content: 'files' })
    // The prompt is one choice for every conversation.
    fireEvent.change(screen.getByRole('combobox', { name: '审查提示词' }), { target: { value: 'p-1' } })
    await waitFor(() => expect(lastPost('/global')?.body).toEqual({ activePromptId: 'p-1' }))
    expect(screen.getByText('这些设置对所有对话通用。')).toBeTruthy()
  })

  it('puts a finding below what is already typed, only when asked, and can send it directly', async () => {
    const drafts: string[] = []
    const undo = registerComposer('s1', { setDraft: (text) => drafts.push(text), draft: () => '我自己写的' })
    render(<ReviewPane sessionId="s1" />)
    await screen.findByText('测试没有通过')
    expect(drafts).toHaveLength(0)
    fireEvent.click(screen.getAllByRole('button', { name: /放进输入框/ })[0]!)
    expect(drafts[0]!.startsWith('我自己写的\n\n【任务审查】')).toBe(true)
    expect(drafts[0]).toContain('证据：第 3 轮 · 第 2 步 · bash')
    expect(posts.filter((post) => post.path === '/send')).toHaveLength(0)
    fireEvent.click(screen.getAllByRole('button', { name: /直接发送/ })[0]!)
    await waitFor(() => expect(lastPost('/send')?.body).toMatchObject({ session: 's1', reportId: 'r1' }))
    undo()
    expect(putIntoComposer('s1', 'x')).toBe(false)
  })

  it('starts a continuous review with the round limit and shows its rounds', async () => {
    render(<ReviewPane sessionId="s1" />)
    await screen.findByText('测试没有通过')
    const rounds = screen.getByRole('spinbutton', { name: '连续审查最多几轮' })
    fireEvent.change(rounds, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /连续审查/ }))
    await waitFor(() => expect(lastPost('/loop/start')).toBeTruthy())
    expect(lastPost('/loop/start')!.body).toMatchObject({ session: 's1', maxRounds: 3, scope: { kind: 'last' }, content: 'both' })
    cleanup()
    resetReviewStates()
    current = state({ loop: { id: 'L', status: 'waiting', round: 2, maxRounds: 3, startedAt: Date.now() - 5000, rounds: [{ round: 1, reportId: 'r1', verdict: 'fail', open: 2, sentAt: Date.now() }, { round: 2 }], message: '已把第 1 轮的问题发给主对话，等它修改' } })
    render(<ReviewPane sessionId="s1" />)
    await screen.findByText('连续审查：等主对话修改')
    expect(screen.getByText(/第 1 轮：有问题 · 2 个问题 · 已发给主对话/)).toBeTruthy()
    expect((screen.getByRole('button', { name: /审查最后一轮/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /停止/ }))
    await waitFor(() => expect(lastPost('/loop/stop')).toBeTruthy())
  })

  it('edits the review prompts in their own view: pick, change, save, add', async () => {
    render(<ReviewPane sessionId="s1" />)
    await screen.findByText('测试没有通过')
    fireEvent.click(screen.getByRole('button', { name: '提示词', pressed: false }))
    const text = await screen.findByRole('textbox', { name: '提示词内容' })
    expect((text as HTMLTextAreaElement).value).toBe('内置要求')
    expect(screen.getByText('使用中')).toBeTruthy()
    fireEvent.change(text, { target: { value: '内置要求，再加一条' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(lastPost('/prompt')?.body).toEqual({ id: 'builtin-standard', name: '标准审查', text: '内置要求，再加一条' }))
    fireEvent.click(screen.getByRole('button', { name: '设为默认' }))
    await waitFor(() => expect(lastPost('/global')?.body).toEqual({ activePromptId: 'p-1' }))
    fireEvent.click(screen.getByRole('button', { name: /新建提示词/ }))
    fireEvent.change(screen.getByRole('textbox', { name: '提示词名字' }), { target: { value: '代码风格' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(lastPost('/prompt')?.body).toEqual({ name: '代码风格', text: '内置要求' }))
  })

  it('shows a running review with its tools and lets it be cancelled', async () => {
    current = state({ running: { id: 'x', trigger: 'live', startedAt: Date.now() - 3000, phase: '读 src/a.ts', text: '{"verdict":', tools: [{ name: 'read_file', target: 'src/a.ts', ok: true }] } })
    const { container } = render(<ReviewPane sessionId="s1" />)
    await screen.findByText(/实时审查：读 src\/a.ts/)
    expect(container.querySelector('.rv-verdict.is-running')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /取消/ }))
    await waitFor(() => expect(lastPost('/cancel')).toBeTruthy())
  })

  it('without reports it explains what the tab does', async () => {
    current = state({ reports: [] })
    render(<ReviewPane sessionId="s1" />)
    await screen.findByText(/还没有审查报告/)
  })
})

describe('the shield button', () => {
  it('a left click reviews the last turn with the panel settings and puts the suggestions into the box', async () => {
    current = state({ settings: { live: false, depth: 'deep', scope: { kind: 'all' }, content: 'files', loopRounds: 5 } })
    const drafts: string[] = []
    const actions = { setDraft: (text: string) => drafts.push(text) }
    const { container } = render(<ShieldButton sessionId="s1" inputActions={actions} useInput={((select: (s: { draft: string }) => unknown) => select({ draft: '' })) as never} />)
    await waitFor(() => expect(container.querySelector('.rv-shield-dot.is-fail')).toBeTruthy())
    await act(async () => {
      fireEvent.click(container.querySelector('.rv-shield-btn')!)
    })
    await waitFor(() => expect(drafts).toHaveLength(1))
    expect(lastPost('/review')!.body).toEqual({ session: 's1', scope: { kind: 'last' }, depth: 'deep', content: 'files' })
    expect(drafts[0]).toContain('测试没有通过')
    expect(drafts[0]).toContain('顺手改了 README')
    expect(container.querySelector('.rv-shield-note')?.textContent).toContain('已把 2 条建议放进输入框')
  })

  it('puts nothing into the box when the review passes', async () => {
    reviewAnswer = { ...report, verdict: 'pass', findings: [] }
    const drafts: string[] = []
    const { container } = render(<ShieldButton sessionId="s1" inputActions={{ setDraft: (text) => drafts.push(text) }} />)
    await waitFor(() => expect(container.querySelector('.rv-shield-dot')).toBeTruthy())
    await act(async () => {
      fireEvent.click(container.querySelector('.rv-shield-btn')!)
    })
    await waitFor(() => expect(container.querySelector('.rv-shield-note')?.textContent).toContain('没有需要修改的问题'))
    expect(drafts).toHaveLength(0)
  })

  it('a right click (or the context-menu key) opens the menu; there is no arrow', async () => {
    const { container } = render(<ShieldButton sessionId="s1" />)
    await waitFor(() => expect(container.querySelector('.rv-shield-dot')).toBeTruthy())
    expect(container.querySelectorAll('button')).toHaveLength(1)
    const shield = container.querySelector('.rv-shield-btn')!
    expect(fireEvent.contextMenu(shield)).toBe(false) // the browser's own menu is held back
    const menu = screen.getByRole('menu', { name: '任务审查' })
    expect(within(menu).getByRole('menuitem', { name: /审查最后一轮，建议放进输入框/ })).toBeTruthy()
    expect(posts.filter((post) => post.path === '/review')).toHaveLength(0)
    expect(within(menu).getByRole('menuitemcheckbox', { name: /实时审查/ }).getAttribute('aria-checked')).toBe('false')
    fireEvent.click(within(menu).getByRole('menuitem', { name: /连续审查最后一轮（最多 5 轮）/ }))
    await waitFor(() => expect(lastPost('/loop/start')?.body).toMatchObject({ session: 's1', maxRounds: 5 }))
    expect(marks(container)).toBe(0)
    cleanup()
    const again = render(<ShieldButton sessionId="s1" />)
    await waitFor(() => expect(again.container.querySelector('.rv-shield-dot')).toBeTruthy())
    fireEvent.keyDown(again.container.querySelector('.rv-shield-btn')!, { key: 'F10', shiftKey: true })
    expect(screen.getByRole('menu', { name: '任务审查' })).toBeTruthy()
  })

  it('a report whose findings were all waved away counts as passed', () => {
    expect(standingVerdict({ ...report, findings: report.findings.map((item) => ({ ...item, dismissed: true as const })) })).toBe('pass')
    expect(standingVerdict({ ...report, findings: [{ ...report.findings[0]!, dismissed: true }, report.findings[1]!] })).toBe('doubt')
    expect(standingVerdict(report)).toBe('fail')
  })
})

describe('the stylesheet', () => {
  it('replaces a stale one left by an older version instead of keeping it', () => {
    document.head.innerHTML = '<style id="dsh-sider-task-reviewer-styles">.rv-root{}</style>'
    ensureStyles()
    const sheets = document.querySelectorAll('#dsh-sider-task-reviewer-styles')
    expect(sheets).toHaveLength(1)
    expect(sheets[0]!.textContent).toBe(CSS)
  })
})
