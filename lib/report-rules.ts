import prisma from "@/db"

// Reports are created from report rules: a category default (e.g. Grant Funding
// forms get a Narrative Report every 3 months) that a template can override (e.g.
// one DFT Application template creates its DFT Report on submission rather than
// approval). Periods split the parent form's own funding period, so nothing has
// to be set up per year.

const DAY_MS = 24 * 60 * 60 * 1000

// A parent in one of these statuses never gets new reports
const BLOCKED_STATUSES = ["Draft", "Rejected", "Paused"]
// Statuses after approval: reaching them counts as having passed any trigger
const APPROVED_STATUSES = ["Approved", "Underway"]

export interface RuleSettings {
  kind: "AFTER_STATUS" | "PERIODIC"
  active: boolean
  reportCategoryId: number
  triggerStatusId: number | null
  dueDays: number | null
  periodMonths: number | null
  opensDaysBefore: number
  dueDaysAfterPeriodEnd: number
}

export interface OverrideSettings {
  enabled: boolean | null
  triggerStatusId: number | null
  dueDays: number | null
  periodMonths: number | null
  opensDaysBefore: number | null
  dueDaysAfterPeriodEnd: number | null
  reportTemplateId: number | null
}

export interface EffectiveRule extends Omit<RuleSettings, "active"> {
  enabled: boolean
  reportTemplateId: number | null
}

/** The rule as it applies to one template: each override field wins when it's set. */
export function effectiveRule(rule: RuleSettings, override?: OverrideSettings | null): EffectiveRule {
  return {
    kind: rule.kind,
    reportCategoryId: rule.reportCategoryId,
    enabled: rule.active && (override?.enabled ?? true),
    triggerStatusId: override?.triggerStatusId ?? rule.triggerStatusId,
    dueDays: override?.dueDays ?? rule.dueDays,
    periodMonths: override?.periodMonths ?? rule.periodMonths,
    opensDaysBefore: override?.opensDaysBefore ?? rule.opensDaysBefore,
    dueDaysAfterPeriodEnd: override?.dueDaysAfterPeriodEnd ?? rule.dueDaysAfterPeriodEnd,
    reportTemplateId: override?.reportTemplateId ?? null,
  }
}

/**
 * Whether a parent in `status` has reached the rule's trigger: the trigger status
 * itself (Approved when unset), or any approved status after it.
 */
export function triggerReached(status: { id: number; label: string }, triggerStatusId: number | null): boolean {
  if (BLOCKED_STATUSES.includes(status.label) && status.id !== triggerStatusId) return false
  if (APPROVED_STATUSES.includes(status.label)) return true
  return triggerStatusId !== null && status.id === triggerStatusId
}

export interface ReportPeriod {
  /** 1-based; stored as the report's `reportPeriod` */
  index: number
  start: Date
  end: Date
  opensOn: Date
  dueOn: Date
  label: string
}

const utcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

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
  rule: { periodMonths: number | null; opensDaysBefore: number; dueDaysAfterPeriodEnd: number },
): ReportPeriod[] {
  const months = rule.periodMonths
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
      opensOn: new Date(end.getTime() - rule.opensDaysBefore * DAY_MS),
      dueOn: new Date(end.getTime() + rule.dueDaysAfterPeriodEnd * DAY_MS),
      label: periodLabel(months, i + 1, start),
    })
  }
  return periods
}

/** The template a rule's reports are created from: the pinned one, else the newest active template in the report category. */
export async function reportTemplateFor(effective: EffectiveRule): Promise<{ id: number; name: string } | null> {
  if (effective.reportTemplateId) {
    return prisma.formTemplate.findUnique({ where: { id: effective.reportTemplateId }, select: { id: true, name: true } })
  }
  return prisma.formTemplate.findFirst({
    where: { formCategoryId: effective.reportCategoryId, active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })
}

const RULE_INCLUDE = {
  overrides: true,
} as const

const PARENT_SELECT = {
  id: true,
  title: true,
  localDevelopmentAgencyId: true,
  fundingStart: true,
  fundingEnd: true,
  primaryFormId: true,
  formTemplateId: true,
  formStatus: { select: { id: true, label: true } },
  formTemplate: { select: { category: { select: { role: true } } } },
} as const

export interface GenerationResult {
  created: number
  skipped: number
  errors: string[]
  createdReports: Array<{ id: number; title: string; parentId: number }>
}

/** Prisma's unique-constraint error: another run created the same report first */
const isDuplicate = (error: unknown) => (error as { code?: string })?.code === "P2002"

/**
 * Create every periodic report that has opened (its `opensOn` is on or before
 * `today`) and doesn't exist yet. Safe to run any number of times: missed days
 * are caught up and nothing is created twice. Pass `parentFormId` to only look at
 * one parent form (e.g. right after it's approved).
 */
export async function generateDueReports(today: Date, parentFormId?: number): Promise<GenerationResult> {
  const result: GenerationResult = { created: 0, skipped: 0, errors: [], createdReports: [] }
  const day = utcDay(today)

  const [rules, draftStatus] = await Promise.all([
    prisma.reportRule.findMany({ where: { kind: "PERIODIC", active: true }, include: RULE_INCLUDE }),
    prisma.formStatus.findFirst({ where: { label: "Draft" }, select: { id: true } }),
  ])
  if (!draftStatus) {
    result.errors.push("Draft status not found")
    return result
  }

  for (const rule of rules) {
    const parents = await prisma.localDevelopmentAgencyForm.findMany({
      where: {
        formTemplate: { formCategoryId: rule.parentCategoryId },
        ...(parentFormId && { id: parentFormId }),
      },
      select: PARENT_SELECT,
    })
    if (parents.length === 0) continue

    const existing = await prisma.localDevelopmentAgencyForm.findMany({
      where: { reportRuleId: rule.id, linkedFormId: { in: parents.map((p) => p.id) } },
      select: { linkedFormId: true, reportPeriod: true },
    })
    const done = new Set(existing.map((r) => `${r.linkedFormId}:${r.reportPeriod}`))

    for (const parent of parents) {
      const override = rule.overrides.find((o) => o.formTemplateId === parent.formTemplateId)
      const effective = effectiveRule(rule, override)
      if (!effective.enabled || !triggerReached(parent.formStatus, effective.triggerStatusId)) continue

      const due = reportPeriods(parent.fundingStart, parent.fundingEnd, effective)
        .filter((p) => p.opensOn <= day && !done.has(`${parent.id}:${p.index}`))
      if (due.length === 0) continue

      const template = await reportTemplateFor(effective)
      if (!template) {
        result.errors.push(`Rule ${rule.id}: no active template in the report category for "${parent.title}"`)
        continue
      }

      for (const period of due) {
        try {
          const report = await prisma.localDevelopmentAgencyForm.create({
            data: {
              localDevelopmentAgencyId: parent.localDevelopmentAgencyId,
              formTemplateId: template.id,
              formStatusId: draftStatus.id,
              formData: {},
              title: `${template.name} – ${period.label}`,
              linkedFormId: parent.id,
              // Grouped under the parent's primary form (or the parent itself if it is one)
              primaryFormId: parent.formTemplate.category?.role === "PRIMARY" ? parent.id : parent.primaryFormId,
              reportRuleId: rule.id,
              reportPeriod: period.index,
              fundingStart: period.start,
              fundingEnd: period.end,
              dueDate: period.dueOn,
            },
            select: { id: true, title: true },
          })
          result.created++
          result.createdReports.push({ id: report.id, title: report.title, parentId: parent.id })
        } catch (error) {
          if (isDuplicate(error)) {
            result.skipped++
          } else {
            result.errors.push(`Rule ${rule.id}, "${parent.title}" ${period.label}: ${(error as Error).message}`)
          }
        }
      }
    }
  }
  return result
}
