/**
 * The text that carries findings to the working model — the same words
 * whether the user puts them into the input box, sends them directly, or a
 * continuous review sends them by itself.
 * @module dsh-sider-task-reviewer/shared/message
 */
import { CATEGORY_LABELS, SEVERITY_LABELS, type Finding, type Report } from './protocol'

function findingText(finding: Finding, index: number): string {
  const lines = [`${index}. （${SEVERITY_LABELS[finding.severity]} · ${CATEGORY_LABELS[finding.category]}）${finding.title}`]
  if (finding.detail !== '') lines.push(`   ${finding.detail.replace(/\n/g, '\n   ')}`)
  if (finding.evidence !== '') lines.push(`   证据：${finding.evidence}`)
  if (finding.suggestion !== '') lines.push(`   建议：${finding.suggestion}`)
  return lines.join('\n')
}

/** The findings that still stand (not waved away). */
export function openFindings(report: Report): Finding[] {
  return report.findings.filter((item) => item.dismissed !== true)
}

/**
 * The message about some findings of a report.
 * @param findings - the findings to send (one, or every open one).
 * @param loop - set when a continuous review sends it by itself.
 */
export function messageFor(report: Report, findings: readonly Finding[], loop?: { round: number; max: number }): string {
  const range = report.turns.from === report.turns.to ? `第 ${report.turns.from} 轮` : `第 ${report.turns.from}–${report.turns.to} 轮`
  const who = `另一个模型（${report.model}）`
  const head =
    loop !== undefined
      ? `【连续审查 · 第 ${loop.round}/${loop.max} 轮】${who}审查了${range}的工作，${findings.length === 1 ? '还有下面这个问题' : `还有下面 ${findings.length} 个问题`}：`
      : `【任务审查】${who}审查了${range}的工作，${findings.length === 1 ? '发现下面这个问题' : `发现下面 ${findings.length} 个问题`}：`
  const body = findings.map((finding, i) => findingText(finding, i + 1)).join('\n\n')
  const tail =
    loop !== undefined
      ? '请逐条核实：确实存在的请直接修正；你认为不成立的，说明理由。改完后简要说明改了什么，审查会自动再看一遍。'
      : '请逐条核实：确实存在的请修正；你认为不成立的，说明理由。'
  return `${head}\n\n${body}\n\n${tail}`
}
