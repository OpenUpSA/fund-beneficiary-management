import type { Prisma } from "@prisma/client"
import prisma from "@/db"
import { FREQUENCY_OPTIONS, REPORT_RULE_LIMITS, type ReportRuleNumberField } from "@/lib/report-rule-format"
import { addDays, effectiveTiming, plannedRows, triggerReached, utcDay } from "@/lib/report-timing"
import { autoFormTitle } from "@/lib/form-tree"

export * from "@/lib/report-timing"

// Reports a form gets come from the report categories attached to its category.
// Each report category has its timing (e.g. Narrative Report: quarterly, opens
// 14 days before the period ends). A template can switch an attached report off
// or change its trigger status (e.g. one DFT Application template creates its
// DFT Report on submission). When a form is created its reports are planned with
// real dates (PlannedReport), and the daily job creates them as they open.
// Changing a setting re-plans the affected running forms' reports that haven't
// been created yet, for periods that haven't ended (replanForms).

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
      overrides: { where: { formTemplateId: form.formTemplateId }, select: { enabled: true, triggerStatusId: true } },
    },
  })
  return links.flatMap((link) => {
    const timing = effectiveTiming(link.reportCategory, link.overrides[0])
    if (!timing) return []
    return plannedRows(form, timing).map((row) => ({
      ...row,
      parentFormId: form.id,
      reportRuleId: link.id,
      reportCategoryId: link.reportCategory.id,
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
 * Reports already created, skipped or edited by hand stay as they are, and no new
 * row is added where it would overlap one of them. Rows of a detached report are never touched.
 * With `from`, periods that ended before that day are left as they are too.
 */
export async function recalculateReports(formId: number, from?: Date): Promise<{ removed: number; added: number }> {
  const rows = await rowsFromSettings(formId)
  const day = from && utcDay(from)
  return prisma.$transaction(async (tx) => {
    const { count: removed } = await tx.plannedReport.deleteMany({
      where: { parentFormId: formId, reportRuleId: { not: null }, status: "PLANNED", edited: false, ...(day && { periodEnd: { gte: day } }) },
    })
    const kept = await tx.plannedReport.findMany({
      where: { parentFormId: formId },
      select: { reportCategoryId: true, periodStart: true, periodEnd: true },
    })
    const fresh = rows.filter((row) =>
      (!day || row.periodEnd >= day) && !kept.some((k) => k.reportCategoryId === row.reportCategoryId && overlaps(k, row)))
    if (fresh.length > 0) await tx.plannedReport.createMany({ data: fresh })
    return { removed, added: fresh.length }
  })
}

/**
 * After a report setting changes, re-plan the reports these forms haven't got
 * yet. Only forms still running are touched, and only periods that haven't
 * ended: finished grants and past periods stay as they were, and reports
 * already created, skipped or edited by hand never change. Returns how many forms were re-planned.
 */
export async function replanForms(where: Prisma.LocalDevelopmentAgencyFormWhereInput, today: Date): Promise<number> {
  const forms = await prisma.localDevelopmentAgencyForm.findMany({ where: runningForms(where, today), select: { id: true } })
  for (const form of forms) await recalculateReports(form.id, today)
  return forms.length
}

/** Forms still running (end date today or later): the ones a settings change re-plans. */
export const runningForms = (where: Prisma.LocalDevelopmentAgencyFormWhereInput, today: Date): Prisma.LocalDevelopmentAgencyFormWhereInput =>
  ({ ...where, fundingEnd: { gte: utcDay(today) } })

/** Forms whose category has this report category attached. */
export const formsGettingReport = (reportCategoryId: number): Prisma.LocalDevelopmentAgencyFormWhereInput => ({
  formTemplate: { category: { reportRules: { some: { reportCategoryId } } } },
})

// ─── Creating reports ────────────────────────────────────────────────────────

/** The template a report is filled in with: the newest active template in its report category. */
export async function reportTemplateFor(reportCategoryId: number) {
  return prisma.formTemplate.findFirst({
    where: { formCategoryId: reportCategoryId, active: true },
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
      reportTemplateFor(row.reportCategoryId),
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
        title: autoFormTitle(template.name, row.label),
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
  ldaId: number
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
      parentForm: { select: { title: true, localDevelopmentAgency: { select: { id: true, name: true } } } },
    },
    orderBy: { opensOn: "asc" },
  })
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parentFormId,
    parentTitle: row.parentForm.title,
    ldaId: row.parentForm.localDevelopmentAgency.id,
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
  if (timing.reportKind === "PERIODIC" && !FREQUENCY_OPTIONS.some((o) => o.months === timing.reportPeriodMonths)) {
    return "Choose quarterly, half-yearly or yearly"
  }
  return numbersError(timing, {
    reportDueDays: "dueDays",
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
}

/** Validate a template's change to an attached report. */
export async function reportOverrideInputError(data: Record<string, unknown>): Promise<string | undefined> {
  if (typeof data.enabled !== "boolean") return "Enabled must be true or false"
  return statusError(data.triggerStatusId)
}

// ─── Editing a planned report (Admin) ────────────────────────────────────────

export const MAX_LABEL_LENGTH = 60

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
 * Parse an edit of a planned report: its period, opening and due dates, and the
 * label shown in the Year / Quarter column and the report's title. Clearing
 * `opensOn` means "open when the trigger is reached".
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
    if (typeof data.label !== "string") return { error: "The label must be text" }
    const label = data.label.trim()
    if (label.length > MAX_LABEL_LENGTH) return { error: `Keep the label under ${MAX_LABEL_LENGTH} characters` }
    edit.label = label
  }
  if ((edit.periodStart ?? current.periodStart) > (edit.periodEnd ?? current.periodEnd)) {
    return { error: "The period must start before it ends" }
  }
  return { edit }
}
