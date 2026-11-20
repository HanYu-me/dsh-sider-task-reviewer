/**
 * Take secrets out of text before it goes to another model provider. The
 * patterns are deliberately the common, high-confidence shapes; a match is
 * replaced by a marker that says what kind of secret was there.
 * @module dsh-sider-task-reviewer/redact
 */

const RULES: ReadonlyArray<{ label: string; pattern: RegExp; keep?: number }> = [
  { label: '私钥', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g },
  { label: 'GitHub token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { label: 'API key', pattern: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}\b/g },
  { label: 'Slack token', pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g },
  { label: 'AWS key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: 'Google key', pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { label: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { label: 'Bearer token', pattern: /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/g, keep: 1 },
  {
    label: '密码/密钥',
    pattern: /\b((?:api[_-]?key|access[_-]?key|secret|token|passw(?:or)?d|pwd|auth)["']?\s*[:=]\s*["']?)([^\s"'`,;]{8,})/gi,
    keep: 1,
  },
]

export interface Redacted {
  text: string
  /** How many secrets were replaced, by kind. */
  counts: Record<string, number>
}

/**
 * Replace secrets in `text`.
 * @param text - anything that is about to leave the machine.
 * @returns the cleaned text and what was taken out.
 */
export function redact(text: string): Redacted {
  const counts: Record<string, number> = {}
  let out = text
  for (const rule of RULES) {
    out = out.replace(rule.pattern, (...match: unknown[]) => {
      counts[rule.label] = (counts[rule.label] ?? 0) + 1
      const prefix = rule.keep !== undefined ? String(match[rule.keep] ?? '') : ''
      return `${prefix}[已隐藏的${rule.label}]`
    })
  }
  return { text: out, counts }
}

/** Sum of {@link Redacted.counts}, as one note line, or nothing when nothing was hidden. */
export function redactionNote(counts: Record<string, number>): string | undefined {
  const parts = Object.entries(counts).filter(([, n]) => n > 0).map(([label, n]) => `${label} ${n} 处`)
  return parts.length > 0 ? `发送前隐藏了：${parts.join('、')}` : undefined
}

/** Merge two count tables. */
export function addCounts(into: Record<string, number>, more: Record<string, number>): Record<string, number> {
  for (const [label, n] of Object.entries(more)) into[label] = (into[label] ?? 0) + n
  return into
}
