/**
 * Wire types shared by the host half (routes, store) and the browser half
 * (panel, shield button). Everything here is plain JSON.
 * @module dsh-sider-task-reviewer/shared/protocol
 */

/** Every route lives under this prefix. */
export const REVIEW_PREFIX = '/sider-task-reviewer'

/** Which part of the conversation a review looks at. */
export type ReviewScope = { kind: 'last' } | { kind: 'all' } | { kind: 'range'; from: number; to: number }

/**
 * How far the reviewer may look.
 * - quick: the conversation (with tool calls and results) plus the files it wrote, as they are now.
 * - deep: the same, and the reviewer may read files, list folders and search in the workspace.
 * The plugin never writes a file or runs a command; whatever needs that is asked of the working conversation.
 */
export type ReviewDepth = 'quick' | 'deep'

/**
 * What the reviewer looks at.
 * - both: the conversation and the files it wrote (default);
 * - conversation: the conversation only (no files, no workspace);
 * - files: the files the conversation wrote, judged against what the user asked.
 */
export type ReviewContent = 'both' | 'conversation' | 'files'

export const CONTENT_LABELS: Record<ReviewContent, string> = { both: '对话和文件', conversation: '只看对话', files: '只看文件' }

/** What started a review. */
export type ReviewTrigger = 'manual' | 'live' | 'loop'

/** The overall call. */
export type Verdict = 'pass' | 'doubt' | 'fail'

export type Severity = 'high' | 'medium' | 'low'

/** The kinds of problems the reviewer is asked to look for. */
export type FindingCategory =
  | 'claim'
  | 'missing'
  | 'scope'
  | 'risk'
  | 'unverified'
  | 'logic'
  | 'assumption'
  | 'fact'
  | 'source'
  | 'detail'
  | 'feasibility'
  | 'alternative'
  | 'other'

export const FINDING_CATEGORIES: readonly FindingCategory[] = ['claim', 'missing', 'scope', 'risk', 'unverified', 'logic', 'assumption', 'fact', 'source', 'detail', 'feasibility', 'alternative', 'other']

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  claim: '声称与证据不符',
  missing: '漏做需求',
  scope: '越界改动',
  risk: '风险',
  unverified: '未验证',
  logic: '推导错误',
  assumption: '假设与条件',
  fact: '事实错误',
  source: '来源与引用',
  detail: '不够准确/详细',
  feasibility: '可行性',
  alternative: '更好的方向',
  other: '其他',
}

export const VERDICT_LABELS: Record<Verdict, string> = { pass: '通过', doubt: '有疑问', fail: '有问题' }

export const SEVERITY_LABELS: Record<Severity, string> = { high: '严重', medium: '中等', low: '轻微' }

/** One thing the reviewer found. */
export interface Finding {
  severity: Severity
  category: FindingCategory
  /** One line. */
  title: string
  /** What is wrong, in a few sentences. */
  detail: string
  /** Where the evidence is: "第 3 轮 · 第 2 步 · bash", a file path, a command. */
  evidence: string
  /** What to do about it. */
  suggestion: string
  /** The user waved it away. */
  dismissed?: true
}

/** A tool the deep reviewer used, for the report's trail. */
export interface ReviewToolUse {
  name: string
  /** Short form of the arguments: the path or the pattern. */
  target: string
  ok: boolean
}

/** One saved review. */
export interface Report {
  id: string
  sessionId: string
  createdAt: number
  trigger: ReviewTrigger
  scope: ReviewScope
  content: ReviewContent
  /** The review prompt used. */
  promptName: string
  /** The reasoning effort asked of the reviewer, when one was picked. */
  effort?: string
  /** Set when the review was one round of a continuous review. */
  loop?: { id: string; round: number; max: number }
  /** Files the review looked at (written by the conversation). */
  files?: string[]
  /** The turns the review covered, inclusive, as numbered in the conversation. */
  turns: { from: number; to: number }
  depth: ReviewDepth
  /** The depth actually used (deep falls back to quick when the model cannot call tools). */
  usedDepth: ReviewDepth
  provider: string
  model: string
  verdict: Verdict
  summary: string
  findings: Finding[]
  /** Things that were checked and are fine. */
  checked: string[]
  tools: ReviewToolUse[]
  /** The model's raw answer when it could not be read as a report. */
  raw?: string
  /** Notes about how the review ran: truncation, fallback, redactions. */
  notes: string[]
  elapsedMs: number
  /** Set once the report (or a finding of it) was sent to the working model. */
  sentAt?: number
}

/** A model the reviewer can use, with the reasoning effort to ask of it. */
export interface ModelRoute {
  provider: string
  model: string
  /** Adapter-owned effort id (see /efforts); absent = the model's default. */
  effort?: string
}

/** The reasoning efforts one model offers. */
export interface ModelEfforts {
  efforts: { id: string; name: string; description?: string }[]
  defaultEffort?: string
}

/** One review prompt: what the reviewer checks. The output format is added by the plugin. */
export interface ReviewPrompt {
  id: string
  name: string
  text: string
  /** The prompt that ships with the plugin (it can be edited and reset, not deleted). */
  builtin?: true
  /** A built-in prompt that was edited. */
  edited?: true
}

export const BUILTIN_PROMPT_ID = 'builtin-standard'
/** The prompts that ship with the plugin, in the order the list shows them. */
export const BUILTIN_PROMPT_IDS = ['builtin-standard', 'builtin-theory', 'builtin-facts', 'builtin-plan'] as const

export interface ModelCatalogGroup {
  id: string
  name: string
  models: { id: string; name: string }[]
}

export interface ModelCatalog {
  groups: ModelCatalogGroup[]
  /** The route a review uses when none is picked. */
  fallback?: ModelRoute
}

/** Plugin-wide settings that are not review choices. */
export interface GlobalSettings {
  /** When live review runs: after each turn, or also during a turn (after a quiet moment following a step). */
  liveTrigger: 'turn' | 'step'
  /** The prompt every review uses. */
  activePromptId: string
}

/**
 * The review choices. One set for every conversation: set once in any
 * conversation's panel, used by all of them (and by the shield button).
 */
export interface SessionSettings {
  /** Review every conversation's turns as they end (only reports; sub-agent sessions are skipped). */
  live: boolean
  route?: ModelRoute
  depth: ReviewDepth
  /** What a review from the panel covers (the shield always reviews the last turn). */
  scope: ReviewScope
  content: ReviewContent
  /** Most rounds of a continuous review. */
  loopRounds: number
}

/** A continuous review: review → send the findings → wait for the fix → review again. */
export interface LoopState {
  id: string
  status: 'reviewing' | 'sending' | 'waiting' | 'passed' | 'limit' | 'stopped' | 'failed'
  round: number
  maxRounds: number
  startedAt: number
  endedAt?: number
  rounds: { round: number; reportId?: string; verdict?: Verdict; open?: number; sentAt?: number }[]
  /** Why it stopped, or what it is waiting for. */
  message?: string
}

/** Body of POST /loop/start. */
export interface LoopRequest {
  session: string
  scope: ReviewScope
  content: ReviewContent
  depth: ReviewDepth
  route?: ModelRoute
  promptId?: string
  maxRounds: number
}

/** A review in progress, as the panel and the shield button see it. */
export interface Running {
  id: string
  trigger: ReviewTrigger
  startedAt: number
  /** What it is doing now: "整理对话", "读 src/index.ts", "等待模型". */
  phase: string
  /** The model's output so far (the tail of it). */
  text: string
  tools: ReviewToolUse[]
}

/**
 * One step of the reviewer's own conversation about a working conversation:
 * every review of it, and what the user and the reviewer said about them.
 * Later reviews and the discussion are sent with this history, so the
 * reviewer stays consistent from one review to the next.
 */
export type ThreadEntry =
  | {
      kind: 'review'
      id: string
      at: number
      reportId: string
      /** What was reviewed, for people: "第 3 轮 · 对话和文件 · 深入". */
      label: string
      provider: string
      model: string
    }
  | {
      kind: 'chat'
      id: string
      at: number
      role: 'user' | 'reviewer'
      text: string
      provider?: string
      model?: string
      tools?: ReviewToolUse[]
      notes?: string[]
    }

/** Body of POST /chat. */
export interface ChatRequest {
  session: string
  text: string
  route?: ModelRoute
}

/** Events streamed by POST /chat (server-sent events, `data:` JSON lines). */
export type ChatStreamEvent =
  | { type: 'phase'; phase: string }
  | { type: 'delta'; text: string }
  | { type: 'tool'; tool: ReviewToolUse }
  | { type: 'done'; entry: ThreadEntry }
  | { type: 'error'; message: string }

/** Everything the panel needs for one conversation. */
export interface SessionState {
  sessionId: string
  /** Whether the host has this conversation loaded. */
  live: boolean
  /** Whether the working agent is running a turn right now. */
  busy: boolean
  turns: number
  cwd?: string
  settings: SessionSettings
  global: GlobalSettings
  /** The reviewer a review would use now, and where that choice comes from. */
  effectiveRoute?: ModelRoute & { from: 'settings' | 'harness' | 'conversation' }
  running?: Running
  loop?: LoopState
  reports: Report[]
  /** The reviewer's conversation about this conversation, oldest first. */
  thread: ThreadEntry[]
  /** A reply of the reviewer being written in the discussion. */
  chatting?: Running
  /** The last error of a review that did not finish. */
  error?: string
}

/** Body of POST /review. */
export interface ReviewRequest {
  session: string
  scope: ReviewScope
  depth: ReviewDepth
  content?: ReviewContent
  route?: ModelRoute
  promptId?: string
}

/** Body of POST /send. */
export interface SendRequest {
  session: string
  text: string
  reportId?: string
}

export interface SendResult {
  mode: 'steer' | 'followup'
}

/** Events streamed by POST /review (server-sent events, `data:` JSON lines). */
export type ReviewStreamEvent =
  | { type: 'phase'; phase: string }
  | { type: 'delta'; text: string }
  | { type: 'tool'; tool: ReviewToolUse }
  | { type: 'done'; report: Report }
  | { type: 'error'; message: string }

/** Every JSON response is `{ ok: true, value }` or `{ ok: false, error }`. */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** Describe a scope for people. */
export function scopeLabel(scope: ReviewScope): string {
  if (scope.kind === 'last') return '最后一轮'
  if (scope.kind === 'all') return '整个对话'
  return scope.from === scope.to ? `第 ${scope.from} 轮` : `第 ${scope.from}–${scope.to} 轮`
}
