// Report timing maths. No database access, so client components (e.g. the
// template's example timeline) can use it too.

const DAY_MS = 24 * 60 * 60 * 1000

// A parent in one of these statuses never gets new reports
const BLOCKED_STATUSES = ["Draft", "Rejected", "Paused"]
// Statuses after approval: reaching them counts as having passed any trigger
const APPROVED_STATUSES = ["Approved", "Underway"]

export const utcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS)

/** A report category's base timing (`FormCategory.report*`). */
export interface CategoryTiming {
  reportKind: "AFTER_STATUS" | "PERIODIC" | null
  reportTriggerStatusId: number | null
  reportDueDays: number | null
  reportPeriodMonths: number | null
  reportOpensDaysBefore: number
  reportDueDaysAfterPeriodEnd: number
}

/** A template's changes to the timing (`ReportRuleOverride`); null fields inherit. */
export interface OverrideSettings {
  enabled: boolean | null
  triggerStatusId: number | null
  dueDays: number | null
  periodMonths: number | null
  opensDaysBefore: number | null
  dueDaysAfterPeriodEnd: number | null
  reportTemplateId: number | null
}

export interface EffectiveTiming {
  kind: "AFTER_STATUS" | "PERIODIC"
  enabled: boolean
  triggerStatusId: number | null
  dueDays: number | null
  periodMonths: number | null
  opensDaysBefore: number
  dueDaysAfterPeriodEnd: number
  reportTemplateId: number | null
}

/**
 * The timing as it applies to one template: each override field wins when it's
 * set. Null when the report category has no timing yet.
 */
export function effectiveTiming(
  category: CategoryTiming,
  override?: OverrideSettings | null,
  linkActive = true,
): EffectiveTiming | null {
  if (!category.reportKind) return null
  return {
    kind: category.reportKind,
    enabled: linkActive && (override?.enabled ?? true),
    triggerStatusId: override?.triggerStatusId ?? category.reportTriggerStatusId,
    dueDays: override?.dueDays ?? category.reportDueDays,
    periodMonths: override?.periodMonths ?? category.reportPeriodMonths,
    opensDaysBefore: override?.opensDaysBefore ?? category.reportOpensDaysBefore,
    dueDaysAfterPeriodEnd: override?.dueDaysAfterPeriodEnd ?? category.reportDueDaysAfterPeriodEnd,
    reportTemplateId: override?.reportTemplateId ?? null,
  }
}

/**
 * Whether a parent in `status` has reached a trigger: the trigger status itself
 * (Approved when unset), or any approved status after it.
 */
export function triggerReached(status: { id: number; label: string }, triggerStatusId: number | null): boolean {
  if (BLOCKED_STATUSES.includes(status.label) && status.id !== triggerStatusId) return false
  if (APPROVED_STATUSES.includes(status.label)) return true
  return triggerStatusId !== null && status.id === triggerStatusId
}

export interface ReportPeriod {
  /** 1-based */
  index: number
  start: Date
  end: Date
  opensOn: Date
  dueOn: Date
  label: string
}

/** `date` plus `months`, keeping the day of month where it exists (31 Jan + 1 month = 28/29 Feb). */
function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)))
}

function periodLabel(periodMonths: number, index: number, start: Date): string {
  const year = start.getUTCFullYear()
  if (periodMonths === 3) return `Q${index} ${year}`
  if (periodMonths === 6) return `H${index} ${year}`
  if (periodMonths === 12) return `Year ${index}`
  if (periodMonths === 1) return start.toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
  return `Period ${index}`
}

// More than enough for monthly reports on a multi-year grant
const MAX_PERIODS = 120

/** Split a parent form's funding period into report periods of `periodMonths`; the last one ends with the funding period. */
export function reportPeriods(
  fundingStart: Date,
  fundingEnd: Date,
  timing: { periodMonths: number | null; opensDaysBefore: number; dueDaysAfterPeriodEnd: number },
): ReportPeriod[] {
  const months = timing.periodMonths
  if (!months || months < 1) return []
  const first = utcDay(fundingStart)
  const last = utcDay(fundingEnd)
  const periods: ReportPeriod[] = []
  for (let i = 0; i < MAX_PERIODS; i++) {
    const start = addMonths(first, i * months)
    if (start > last) break
    const nextStart = addMonths(first, (i + 1) * months)
    const end = new Date(Math.min(nextStart.getTime() - DAY_MS, last.getTime()))
    periods.push({
      index: i + 1,
      start,
      end,
      opensOn: addDays(end, -timing.opensDaysBefore),
      dueOn: addDays(end, timing.dueDaysAfterPeriodEnd),
      label: periodLabel(months, i + 1, start),
    })
  }
  return periods
}

export interface PlannedRow {
  period: number
  label: string
  triggerStatusId: number | null
  periodStart: Date
  periodEnd: Date
  opensOn: Date | null
  dueOn: Date | null
  dueDays: number | null
}

/**
 * The reports a parent with these dates gets from one timing: one row per period,
 * or a single row (period 0) that opens when the trigger is reached.
 */
export function plannedRows(parent: { fundingStart: Date; fundingEnd: Date }, timing: EffectiveTiming): PlannedRow[] {
  if (!timing.enabled) return []
  if (timing.kind === "AFTER_STATUS") {
    return [{
      period: 0,
      label: "",
      triggerStatusId: timing.triggerStatusId,
      periodStart: utcDay(parent.fundingStart),
      periodEnd: utcDay(parent.fundingEnd),
      opensOn: null,
      dueOn: null,
      dueDays: timing.dueDays,
    }]
  }
  return reportPeriods(parent.fundingStart, parent.fundingEnd, timing).map((p) => ({
    period: p.index,
    label: p.label,
    triggerStatusId: timing.triggerStatusId,
    periodStart: p.start,
    periodEnd: p.end,
    opensOn: p.opensOn,
    dueOn: p.dueOn,
    dueDays: null,
  }))
}
