/**
 * Read the reviewer's answer. Models wrap JSON in fences, add a sentence
 * before it, or drop fields; all of that is tolerated. What cannot be read is
 * kept verbatim so the user still sees it.
 * @module dsh-sider-task-reviewer/parse
 */
import { FINDING_CATEGORIES, type Finding, type Severity, type Verdict } from './shared/protocol'

export interface ParsedReview {
  verdict: Verdict
  summary: string
  findings: Finding[]
  checked: string[]
  /** The answer was cut off; only its complete part was read. */
  partial?: true
}

const VERDICTS: readonly Verdict[] = ['pass', 'doubt', 'fail']
const SEVERITIES: readonly Severity[] = ['high', 'medium', 'low']
const CATEGORIES = FINDING_CATEGORIES

/** The JSON object candidates in a text: fenced blocks first, then balanced braces. */
function candidates(text: string): string[] {
  const out: string[] = []
  for (const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) out.push(match[1]!.trim())
  // Every top-level balanced {...}, ignoring braces inside strings.
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') {
      if (depth === 0) start = i
      depth += 1
    } else if (ch === '}' && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) out.push(text.slice(start, i + 1))
    }
  }
  // The longest object last-written is usually the answer.
  return out.sort((a, b) => b.length - a.length)
}

function str(value: unknown, limit = 2000): string {
  if (typeof value === 'string') return value.trim().slice(0, limit)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T, aliases: Record<string, T> = {}): T {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if ((allowed as readonly string[]).includes(text)) return text as T
  return aliases[text] ?? fallback
}

function finding(raw: unknown): Finding | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const item = raw as Record<string, unknown>
  const title = str(item.title, 300) || str(item.detail, 120)
  if (title === '') return undefined
  return {
    severity: pick(item.severity, SEVERITIES, 'medium', { critical: 'high', major: 'high', minor: 'low', info: 'low', 严重: 'high', 中等: 'medium', 轻微: 'low' }),
    category: pick(item.category, CATEGORIES, 'other'),
    title,
    detail: str(item.detail),
    evidence: str(item.evidence, 600),
    suggestion: str(item.suggestion, 1000),
  }
}

/** The verdict the findings imply, when the model gave none. */
export function impliedVerdict(findings: readonly Finding[]): Verdict {
  if (findings.some((item) => item.severity === 'high')) return 'fail'
  if (findings.some((item) => item.severity === 'medium')) return 'doubt'
  return findings.length > 0 ? 'doubt' : 'pass'
}

/**
 * Close a JSON object that was cut off (the model hit its length limit):
 * cut back to the last complete value and add the missing closers. Tries the
 * latest cut points first.
 */
export function salvageCandidates(text: string, attempts = 60): string[] {
  const start = text.indexOf('{')
  if (start < 0) return []
  const cuts: { at: number; closers: string }[] = []
  const stack: string[] = []
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') {
        inString = false
        // A finished string is a cut point too: an item of the checked list, or a value like the summary
        // (a cut after a key only makes invalid JSON, which the caller skips).
        cuts.push({ at: i + 1, closers: [...stack].reverse().join('') })
      }
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') {
      stack.pop()
      if (stack.length === 0) break
      cuts.push({ at: i + 1, closers: [...stack].reverse().join('') })
    }
  }
  return cuts.slice(-attempts).reverse().map((cut) => text.slice(start, cut.at).replace(/,\s*$/, '') + cut.closers)
}

function fromRecord(record: Record<string, unknown>): ParsedReview | undefined {
  if (!('verdict' in record) && !('findings' in record) && !('summary' in record)) return undefined
  const findings = Array.isArray(record.findings) ? record.findings.map(finding).filter((item): item is Finding => item !== undefined).slice(0, 40) : []
  const verdict = 'verdict' in record ? pick(record.verdict, VERDICTS, impliedVerdict(findings), { ok: 'pass', passed: 'pass', warn: 'doubt', warning: 'doubt', failed: 'fail', 通过: 'pass', 有疑问: 'doubt', 有问题: 'fail' }) : impliedVerdict(findings)
  const checked = Array.isArray(record.checked) ? record.checked.map((item) => str(item, 300)).filter((item) => item !== '').slice(0, 30) : []
  return { verdict, summary: str(record.summary, 1000), findings, checked }
}

/**
 * Parse the reviewer's text.
 * @returns the review, or undefined when no usable JSON object is in it.
 */
export function parseReview(text: string): ParsedReview | undefined {
  const whole = parseWhole(text)
  if (whole !== undefined) return whole
  for (const candidate of salvageCandidates(text)) {
    try {
      const value: unknown = JSON.parse(candidate)
      if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
      const parsed = fromRecord(value as Record<string, unknown>)
      if (parsed !== undefined && (parsed.summary !== '' || parsed.findings.length > 0)) return { ...parsed, partial: true }
    } catch {
      // try an earlier cut
    }
  }
  return undefined
}

function parseWhole(text: string): ParsedReview | undefined {
  for (const candidate of candidates(text)) {
    let value: unknown
    try {
      value = JSON.parse(candidate)
    } catch {
      continue
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
    const parsed = fromRecord(value as Record<string, unknown>)
    if (parsed !== undefined) return parsed
  }
  return undefined
}
