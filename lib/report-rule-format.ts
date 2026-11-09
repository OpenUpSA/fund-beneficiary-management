// Wording and limits for report rules. No database access, so client components can import it.

export const REPORT_RULE_LIMITS = {
  dueDays: [0, 365],
  opensDaysBefore: [0, 365],
  dueDaysAfterPeriodEnd: [-365, 365],
} as const

export type ReportRuleNumberField = keyof typeof REPORT_RULE_LIMITS

export const FREQUENCY_OPTIONS = [
  { months: 3, label: "Quarterly" },
  { months: 6, label: "Half-yearly" },
  { months: 12, label: "Yearly" },
] as const

/** "UnderReview" -> "Under review (submitted)", "Approved" -> "Approved" */
export const statusLabel = (label: string) =>
  label === "UnderReview"
    ? "Under review (submitted)"
    : label.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^(\w)(.*)$/, (_, a: string, b: string) => a + b.toLowerCase())

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`

export function frequencyLabel(months: number | null): string {
  if (!months) return "—"
  return FREQUENCY_OPTIONS.find((o) => o.months === months)?.label ?? `Every ${months} months`
}

/** One-line summary, e.g. "When Approved · due 30 days after" or "Quarterly · opens 14 days before period end · due 15 days after". */
export function describeRule(
  rule: {
    kind: string
    triggerStatusId: number | null
    dueDays: number | null
    periodMonths: number | null
    opensDaysBefore: number
    dueDaysAfterPeriodEnd: number
  },
  statuses: Array<{ id: number; label: string }>,
): string {
  const trigger = rule.triggerStatusId
    ? statusLabel(statuses.find((s) => s.id === rule.triggerStatusId)?.label ?? "the chosen status")
    : "Approved"
  if (rule.kind === "AFTER_STATUS") {
    return `When ${trigger} · ${rule.dueDays != null ? `due ${days(rule.dueDays)} after` : "no due date"}`
  }
  const due = rule.dueDaysAfterPeriodEnd >= 0
    ? `due ${days(rule.dueDaysAfterPeriodEnd)} after period end`
    : `due ${days(-rule.dueDaysAfterPeriodEnd)} before period end`
  const start = trigger === "Approved" ? "" : ` · from ${trigger}`
  return `${frequencyLabel(rule.periodMonths)}${start} · opens ${days(rule.opensDaysBefore)} before period end · ${due}`
}

/** A report category's stored timing (`FormCategory.report*`) in the shape `describeRule` takes. Null when none is set. */
export function categoryTiming(category: {
  reportKind: string | null
  reportTriggerStatusId: number | null
  reportDueDays: number | null
  reportPeriodMonths: number | null
  reportOpensDaysBefore: number
  reportDueDaysAfterPeriodEnd: number
}) {
  if (!category.reportKind) return null
  return {
    kind: category.reportKind,
    triggerStatusId: category.reportTriggerStatusId,
    dueDays: category.reportDueDays,
    periodMonths: category.reportPeriodMonths,
    opensDaysBefore: category.reportOpensDaysBefore,
    dueDaysAfterPeriodEnd: category.reportDueDaysAfterPeriodEnd,
  }
}
