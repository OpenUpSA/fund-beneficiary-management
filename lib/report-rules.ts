import prisma from "@/db"
import { REPORT_RULE_LIMITS, type ReportRuleNumberField } from "@/lib/report-rule-format"
import { addDays, effectiveTiming, plannedRows, triggerReached, utcDay } from "@/lib/report-timing"

export * from "@/lib/report-timing"

// Reports a form gets come from the report categories attached to its category.
// Each report category has a base timing (e.g. Narrative Report: quarterly, opens
// 14 days before the period ends) that a template can override (e.g. one DFT
// Application template creates its DFT Report on submission). When a form is
// created its reports are planned with real dates (PlannedReport); approvers can
// edit, skip, add or create them early, and the daily job creates the rest as
// they open. Settings changes only affect forms created afterwards.

// After-status reports in these statuses were parked by an earlier status change
// on the parent and are reopened when the parent reaches the trigger again
const REOPENABLE_STATUSES = ["Paused", "Rejected"]
// A finished report is never parked again
const SETTLED_STATUSES = ["Approved"]

const overlaps = (a: { periodStart: Date; periodEnd: Date }, b: { periodStart: Date; periodEnd: Date }) =>
  a.periodStart <= b.periodEnd && b.periodStart <= a.periodEnd

// ─── Planning ────────────────────────────────────────────────────────────────

const TIMING_SELECT = {
  reportKind: true,
  reportTriggerStatusId: true,
  reportDueDays: true,
  reportPeriodMonths: true,
  reportOpensDaysBefore: true,
  reportDueDaysAfterPeriodEnd: true,
} as const

/** The rows each attached report category would give this form now. */
async function rowsFromSettings(formId: number) {
  const form = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: formId },
    select: { id: true, fundingStart: true, fundingEnd: true, formTemplateId: true, formTemplate: { select: { formCategoryId: true } } },
  })
  const categoryId = form?.formTemplate.formCategoryId
  if (!form || !categoryId) return []

  const links = await prisma.reportRule.findMany({
    where: { parentCategoryId: categoryId },
    include: {
      reportCategory: { select: { id: true, ...TIMING_SELECT } },
      overrides: { where: { formTemplateId: form.formTemplateId } },
    },
  })
  return links.flatMap((link) => {
    const timing = effectiveTiming(link.reportCategory, link.overrides[0], link.active)
    if (!timing) return []
    return plannedRows(form, timing).map((row) => ({
      ...row,
      parentFormId: form.id,
      reportRuleId: link.id,
      reportCategoryId: link.reportCategory.id,
      reportTemplateId: timing.reportTemplateId,
    }))
  })
}

/** Plan a new form's reports from the current settings. Does nothing if it already has rule rows. */
export async function planReports(formId: number): Promise<number> {
  const already = await prisma.plannedReport.count({ where: { parentFormId: formId, reportRuleId: { not: null } } })
  if (already > 0) return 0
  const rows = await rowsFromSettings(formId)
  if (rows.length === 0) return 0
  const { count } = await prisma.plannedReport.createMany({ data: rows })
  return count
}

/**
 * Re-plan a form's reports from the current settings and its current dates.
 * Rows that were created, skipped or edited by hand stay as they are, and no new
 * row is added where it would overlap one of them. One-off rows are never touched.
 */
export async function recalculateReports(formId: number): Promise<{ removed: number; added: number }> {
  const rows = await rowsFromSettings(formId)
  return prisma.$transaction(async (tx) => {
    const { count: removed } = await tx.plannedReport.deleteMany({
      where: { parentFormId: formId, reportRuleId: { not: null }, status: "PLANNED", edited: false },
    })
    const kept = await tx.plannedReport.findMany({
      where: { parentFormId: formId },
      select: { reportCategoryId: true, periodStart: true, periodEnd: true },
    })
    const fresh = rows.filter((row) => !kept.some((k) => k.reportCategoryId === row.reportCategoryId && overlaps(k, row)))
    if (fresh.length > 0) await tx.plannedReport.createMany({ data: fresh })
    return { removed, added: fresh.length }
  })
}

// ─── Creating reports ────────────────────────────────────────────────────────

/** The template a planned report is filled in with: the pinned one, else the newest active template in its category. */
export async function reportTemplateFor(row: { reportTemplateId: number | null; reportCategoryId: number }) {
  if (row.reportTemplateId) {
    return prisma.formTemplate.findUnique({ where: { id: row.reportTemplateId }, select: { id: true, name: true } })
  }
  return prisma.formTemplate.findFirst({
    where: { formCategoryId: row.reportCategoryId, active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })
}

export type CreateResult =
  | { ok: true; report: { id: number; title: string } }
  | { ok: false; error: string }

/**
 * Turn a planned report into a report form (Draft, under the parent). Claims the
 * row first so two runs never create the same report.
 */
export async function createReport(rowId: number, today: Date): Promise<CreateResult> {
  const claimed = await prisma.plannedReport.updateMany({ where: { id: rowId, status: "PLANNED" }, data: { status: "CREATED" } })
  if (claimed.count === 0) return { ok: false, error: "Already created or skipped" }

  const release = async (error: string): Promise<CreateResult> => {
    await prisma.plannedReport.update({ where: { id: rowId }, data: { status: "PLANNED" } })
    return { ok: false, error }
  }

  try {
    const row = await prisma.plannedReport.findUniqueOrThrow({
      where: { id: rowId },
      include: {
        reportCategory: { select: { label: true } },
        parentForm: {
          select: { localDevelopmentAgencyId: true, primaryFormId: true, formTemplate: { select: { category: { select: { role: true } } } } },
        },
      },
    })
    const [template, draft] = await Promise.all([
      reportTemplateFor(row),
      prisma.formStatus.findFirst({ where: { label: "Draft" }, select: { id: true } }),
    ])
    if (!template) return release(`No active ${row.reportCategory.label} template`)
    if (!draft) return release("Draft status not found")

    const parent = row.parentForm
    // The report and its link back to the row are saved together, so a failure can't leave a report the row doesn't know about
    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.localDevelopmentAgencyForm.create({
        data: {
        localDevelopmentAgencyId: parent.localDevelopmentAgencyId,
        formTemplateId: template.id,
        formStatusId: draft.id,
        formData: {},
        title: row.label ? `${template.name} – ${row.label}` : template.name,
        linkedFormId: row.parentFormId,
        // Grouped under the parent's primary form (or the parent itself if it is one)
        primaryFormId: parent.formTemplate.category?.role === "PRIMARY" ? row.parentFormId : parent.primaryFormId,
        fundingStart: row.periodStart,
        fundingEnd: row.periodEnd,
        // A set date wins; otherwise N days from today (UTC calendar day); otherwise none
        dueDate: row.dueOn ?? (row.dueDays != null ? addDays(utcDay(today), row.dueDays) : null),
        },
        select: { id: true, title: true },
      })
      await tx.plannedReport.update({ where: { id: rowId }, data: { reportFormId: created.id } })
      return created
    })
    return { ok: true, report }
  } catch (error) {
    return release((error as Error).message)
  }
}

export interface GenerationResult {
  created: number
  errors: string[]
  createdReports: Array<{ id: number; title: string; parentId: number }>
}

/** Planned reports that are due to be created: opened (or opening on the trigger) for parents that reached it. */
async function dueRows(today: Date, parentFormId?: number) {
  const day = utcDay(today)
  const rows = await prisma.plannedReport.findMany({
    where: {
      status: "PLANNED",
      OR: [{ opensOn: null }, { opensOn: { lte: day } }],
      ...(parentFormId && { parentFormId }),
    },
    select: {
      id: true,
      label: true,
      parentFormId: true,
      triggerStatusId: true,
      reportCategory: { select: { label: true } },
      parentForm: { select: { title: true, formStatus: { select: { id: true, label: true } } } },
    },
    orderBy: [{ opensOn: "asc" }, { id: "asc" }],
  })
  return rows.filter((row) => triggerReached(row.parentForm.formStatus, row.triggerStatusId))
}

/**
 * Create every planned report whose opening date has passed and whose parent has
 * reached its trigger. Safe to run any number of times: missed days are caught up
 * and nothing is created twice. Pass `parentFormId` to look at one parent only.
 */
export async function generateDueReports(today: Date, parentFormId?: number): Promise<GenerationResult> {
  const result: GenerationResult = { created: 0, errors: [], createdReports: [] }
  for (const row of await dueRows(today, parentFormId)) {
    const created = await createReport(row.id, today)
    if (created.ok) {
      result.created++
      result.createdReports.push({ ...created.report, parentId: row.parentFormId })
    } else if (created.error !== "Already created or skipped") {
      const report = [row.reportCategory.label, row.label].filter(Boolean).join(" ")
      result.errors.push(`"${row.parentForm.title}" ${report}: ${created.error}`)
    }
  }
  return result
}

export interface UpcomingReport {
  id: number
  parentId: number
  parentTitle: string
  ldaName: string
  reportName: string
  label: string
  opensOn: string
  dueOn: string | null
}

/** Planned reports that open after `today` and within `days`, soonest first. */
export async function upcomingReports(today: Date, days: number): Promise<UpcomingReport[]> {
  const from = utcDay(today)
  const rows = await prisma.plannedReport.findMany({
    where: { status: "PLANNED", opensOn: { gt: from, lte: addDays(from, days) } },
    select: {
      id: true,
      label: true,
      opensOn: true,
      dueOn: true,
      parentFormId: true,
      reportCategory: { select: { label: true } },
      parentForm: { select: { title: true, localDevelopmentAgency: { select: { name: true } } } },
    },
    orderBy: { opensOn: "asc" },
  })
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parentFormId,
    parentTitle: row.parentForm.title,
    ldaName: row.parentForm.localDevelopmentAgency.name,
    reportName: row.reportCategory.label,
    label: row.label,
    opensOn: row.opensOn!.toISOString(),
    dueOn: row.dueOn?.toISOString() ?? null,
  }))
}

// ─── Status changes ──────────────────────────────────────────────────────────

export interface StatusReportsResult {
  created: Array<{ id: number; title: string }>
}

/**
 * After a form's status changes (approval, submission, rejection…): create its
 * planned reports that are now due, and park or reopen the after-status reports
 * already created (Rejected when the parent is rejected, Paused when it moves
 * back, Draft again when it reaches the trigger again).
 */
export async function applyStatusReports(formId: number, today: Date): Promise<StatusReportsResult> {
  const result: StatusReportsResult = { created: [] }
  const parent = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: formId },
    select: { formStatus: { select: { id: true, label: true } } },
  })
  if (!parent) return result

  const generated = await generateDueReports(today, formId)
  result.created.push(...generated.createdReports.map(({ id, title }) => ({ id, title })))

  const afterStatus = await prisma.plannedReport.findMany({
    where: { parentFormId: formId, status: "CREATED", period: 0, reportFormId: { not: null } },
    select: { triggerStatusId: true, reportForm: { select: { id: true, formStatus: { select: { label: true } } } } },
  })
  if (afterStatus.length === 0) return result

  const statuses = await prisma.formStatus.findMany({
    where: { label: { in: ["Draft", "Paused", "Rejected"] } },
    select: { id: true, label: true },
  })
  const statusId = (label: string) => statuses.find((s) => s.label === label)?.id

  for (const { triggerStatusId, reportForm } of afterStatus) {
    if (!reportForm) continue
    const current = reportForm.formStatus.label
    let next: number | undefined
    if (triggerReached(parent.formStatus, triggerStatusId)) {
      if (REOPENABLE_STATUSES.includes(current)) next = statusId("Draft")
    } else if (!SETTLED_STATUSES.includes(current)) {
      next = statusId(parent.formStatus.label === "Rejected" ? "Rejected" : "Paused")
    }
    if (next) await prisma.localDevelopmentAgencyForm.update({ where: { id: reportForm.id }, data: { formStatusId: next } })
  }
  return result
}

// ─── Validation ──────────────────────────────────────────────────────────────

const inRange = (value: unknown, [min, max]: readonly [number, number]) =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max

function numbersError(data: Record<string, unknown>, fields: Record<string, ReportRuleNumberField>): string | undefined {
  for (const [field, limitName] of Object.entries(fields)) {
    const value = data[field]
    const limits = REPORT_RULE_LIMITS[limitName]
    if (value != null && !inRange(value, limits)) return `${field} must be a whole number from ${limits[0]} to ${limits[1]}`
  }
}

async function statusError(statusId: unknown): Promise<string | undefined> {
  if (statusId == null) return
  const status = Number.isInteger(statusId)
    ? await prisma.formStatus.findUnique({ where: { id: statusId as number }, select: { id: true } })
    : null
  if (!status) return "Trigger status not found"
}

export const TIMING_FIELDS = [
  "reportKind",
  "reportTriggerStatusId",
  "reportDueDays",
  "reportPeriodMonths",
  "reportOpensDaysBefore",
  "reportDueDaysAfterPeriodEnd",
] as const

/** Validate a report category's timing (as it will be after a partial update). */
export async function reportTimingInputError(timing: Record<string, unknown>): Promise<string | undefined> {
  if (timing.reportKind == null) return
  if (timing.reportKind !== "AFTER_STATUS" && timing.reportKind !== "PERIODIC") return "Choose when the report is created"
  if (timing.reportKind === "PERIODIC" && timing.reportPeriodMonths == null) return "Periodic reports need a frequency"
  return numbersError(timing, {
    reportDueDays: "dueDays",
    reportPeriodMonths: "periodMonths",
    reportOpensDaysBefore: "opensDaysBefore",
    reportDueDaysAfterPeriodEnd: "dueDaysAfterPeriodEnd",
  }) ?? (await statusError(timing.reportTriggerStatusId))
}

/** Validate a new link between a primary/secondary category and a report category. */
export async function reportLinkInputError(data: Record<string, unknown>): Promise<string | undefined> {
  const [parent, report] = await Promise.all([
    Number.isInteger(data.parentCategoryId)
      ? prisma.formCategory.findUnique({ where: { id: data.parentCategoryId as number }, select: { role: true } })
      : null,
    Number.isInteger(data.reportCategoryId)
      ? prisma.formCategory.findUnique({ where: { id: data.reportCategoryId as number }, select: { role: true } })
      : null,
  ])
  if (!parent || parent.role === "REPORT") return "Reports belong to a primary or secondary category"
  if (report?.role !== "REPORT") return "Choose a report category"
  if (data.active !== undefined && typeof data.active !== "boolean") return "Active must be true or false"
}

/** Validate a template's override; a pinned report template must be in the report category. */
export async function reportOverrideInputError(
  data: Record<string, unknown>,
  link: { reportCategoryId: number },
): Promise<string | undefined> {
  if (data.enabled != null && typeof data.enabled !== "boolean") return "Enabled must be true or false"
  const error = numbersError(data, {
    dueDays: "dueDays",
    periodMonths: "periodMonths",
    opensDaysBefore: "opensDaysBefore",
    dueDaysAfterPeriodEnd: "dueDaysAfterPeriodEnd",
  }) ?? (await statusError(data.triggerStatusId))
  if (error) return error
  if (data.reportTemplateId != null) {
    const template = Number.isInteger(data.reportTemplateId)
      ? await prisma.formTemplate.findUnique({ where: { id: data.reportTemplateId as number }, select: { formCategoryId: true } })
      : null
    if (template?.formCategoryId !== link.reportCategoryId) return "The report template must be in the report category"
  }
}

export const OVERRIDE_FIELDS = [
  "enabled",
  "triggerStatusId",
  "dueDays",
  "periodMonths",
  "opensDaysBefore",
  "dueDaysAfterPeriodEnd",
  "reportTemplateId",
] as const

const parseDay = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : utcDay(date)
}

export interface PlannedReportEdit {
  periodStart?: Date
  periodEnd?: Date
  opensOn?: Date | null
  dueOn?: Date | null
  label?: string
}

/**
 * Parse an approver's edit of a planned report's dates. Returns the changes or
 * an error. Clearing `opensOn` means "open when the trigger is reached".
 */
export function parsePlannedReportEdit(
  data: Record<string, unknown>,
  current: { periodStart: Date; periodEnd: Date },
): { edit: PlannedReportEdit } | { error: string } {
  const edit: PlannedReportEdit = {}
  for (const field of ["periodStart", "periodEnd", "opensOn", "dueOn"] as const) {
    if (data[field] === undefined) continue
    const day = parseDay(data[field])
    if (day === undefined) return { error: `${field} isn't a valid date` }
    if (day === null && (field === "periodStart" || field === "periodEnd")) return { error: "A report needs a start and end date" }
    ;(edit as Record<string, Date | null>)[field] = day
  }
  if (data.label !== undefined) {
    if (typeof data.label !== "string") return { error: "Label must be text" }
    edit.label = data.label.trim()
  }
  if ((edit.periodStart ?? current.periodStart) > (edit.periodEnd ?? current.periodEnd)) {
    return { error: "The period must start before it ends" }
  }
  return { edit }
}
