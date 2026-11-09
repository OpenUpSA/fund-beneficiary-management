/**
 * Convert the old report settings into report timing on categories.
 *
 *  - A template's "linked form template" (one report after a status) and each
 *    report schedule config (quarterly, … on an application template) say that
 *    forms of one template get reports of another.
 *  - The report template's category gets that timing as its base (the newest
 *    setting wins), the two categories are linked, and any template whose
 *    setting differs gets a template override. Templates in the parent category
 *    that never had the report get an "off" override, so every template keeps
 *    behaving as before.
 *  - Reports those settings already created are recorded as created planned
 *    reports, so they aren't created again.
 *
 * Templates need a category first (Form templates → Categories); the dry run
 * lists any that are missing. Afterwards run `yarn plan-reports` to plan the
 * remaining reports of existing forms.
 *
 *   yarn migrate-report-rules            # dry run, prints everything it would do
 *   yarn migrate-report-rules --commit   # apply
 */
import prisma from "../db"
import { reportPeriods } from "../lib/report-timing"

const commit = process.argv.includes("--commit")

const MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, BIANNUALLY: 6, ANNUALLY: 12 }

interface Timing {
  reportKind: "AFTER_STATUS" | "PERIODIC"
  reportTriggerStatusId: number | null
  reportDueDays: number | null
  reportPeriodMonths: number | null
  reportOpensDaysBefore: number
  reportDueDaysAfterPeriodEnd: number
}

interface Source {
  description: string
  parentTemplateId: number
  reportTemplateId: number
  timing: Timing
  active: boolean
}

async function main() {
  const [templates, configs, categories, links] = await Promise.all([
    prisma.formTemplate.findMany({
      select: {
        id: true,
        name: true,
        formCategoryId: true,
        category: { select: { role: true, label: true } },
        linkedFormTemplateId: true,
        linkedFormTriggerStatusId: true,
        linkedFormDueDays: true,
        createdAt: true,
      },
    }),
    prisma.reportScheduleConfig.findMany({ orderBy: { id: "asc" } }),
    prisma.formCategory.findMany(),
    prisma.reportRule.findMany({ include: { overrides: true } }),
  ])
  const template = (id: number) => templates.find((t) => t.id === id)!
  const categoryLabel = (id: number) => categories.find((c) => c.id === id)?.label ?? `#${id}`

  // Newest first, so the first source for a report category becomes its base timing
  const sources: Source[] = [
    ...templates
      .filter((t) => t.linkedFormTemplateId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t): Source => ({
        description: `"${t.name}" linked form → "${template(t.linkedFormTemplateId!).name}"`,
        parentTemplateId: t.id,
        reportTemplateId: t.linkedFormTemplateId!,
        active: true,
        timing: {
          reportKind: "AFTER_STATUS",
          reportTriggerStatusId: t.linkedFormTriggerStatusId,
          reportDueDays: t.linkedFormDueDays,
          reportPeriodMonths: null,
          reportOpensDaysBefore: 14,
          reportDueDaysAfterPeriodEnd: 0,
        },
      })),
    ...[...configs].reverse().map((c): Source => ({
      description: `"${template(c.applicationTemplateId).name}" ${c.frequency.toLowerCase()} schedule → "${template(c.reportTemplateId).name}"`,
      parentTemplateId: c.applicationTemplateId,
      reportTemplateId: c.reportTemplateId,
      active: c.active,
      timing: {
        reportKind: "PERIODIC",
        reportTriggerStatusId: null,
        reportDueDays: null,
        reportPeriodMonths: MONTHS[c.frequency],
        reportOpensDaysBefore: c.availableDaysBefore,
        reportDueDaysAfterPeriodEnd: c.dueDaysAfterPeriodEnd,
      },
    })),
  ]

  const problems: string[] = []
  const actions: Array<{ describe: string; run: () => Promise<void> }> = []

  // Base timing per report category: what it already has, else the newest source
  const baseTiming = new Map<number, Timing>()
  for (const c of categories) {
    if (c.reportKind) baseTiming.set(c.id, {
      reportKind: c.reportKind,
      reportTriggerStatusId: c.reportTriggerStatusId,
      reportDueDays: c.reportDueDays,
      reportPeriodMonths: c.reportPeriodMonths,
      reportOpensDaysBefore: c.reportOpensDaysBefore,
      reportDueDaysAfterPeriodEnd: c.reportDueDaysAfterPeriodEnd,
    })
  }

  // Per link: the parent templates that had it, with their timing
  const planned = new Map<string, { parentCategoryId: number; reportCategoryId: number; templates: Map<number, Source>; reportTemplateIds: Set<number> }>()

  for (const source of sources) {
    const parent = template(source.parentTemplateId)
    const report = template(source.reportTemplateId)
    if (!parent.formCategoryId || !report.formCategoryId) {
      const missing = [!parent.formCategoryId && `"${parent.name}"`, !report.formCategoryId && `"${report.name}"`].filter(Boolean)
      problems.push(`${source.description}: assign a category to ${missing.join(" and ")}`)
      continue
    }
    if (report.category?.role !== "REPORT") {
      problems.push(`${source.description}: "${report.name}" is in ${report.category?.label}, which isn't a report category`)
      continue
    }
    if (parent.category?.role === "REPORT") {
      problems.push(`${source.description}: "${parent.name}" is in a report category, so it can't have reports`)
      continue
    }

    if (!baseTiming.has(report.formCategoryId)) {
      baseTiming.set(report.formCategoryId, source.timing)
      const categoryId = report.formCategoryId
      actions.push({
        describe: `Set ${categoryLabel(categoryId)} timing: ${source.timing.reportKind === "PERIODIC" ? `every ${source.timing.reportPeriodMonths} months, opens ${source.timing.reportOpensDaysBefore}d before, due ${source.timing.reportDueDaysAfterPeriodEnd}d after` : `after a status, due ${source.timing.reportDueDays ?? "—"} days after`}`,
        run: async () => { await prisma.formCategory.update({ where: { id: categoryId }, data: source.timing }) },
      })
    } else if (baseTiming.get(report.formCategoryId)!.reportKind !== source.timing.reportKind) {
      problems.push(`${source.description}: ${categoryLabel(report.formCategoryId)} is already timed ${baseTiming.get(report.formCategoryId)!.reportKind === "PERIODIC" ? "periodically" : "after a status"}; a template can't change that, so set this one up by hand`)
      continue
    }

    const key = `${parent.formCategoryId}:${report.formCategoryId}`
    const link = planned.get(key) ?? { parentCategoryId: parent.formCategoryId, reportCategoryId: report.formCategoryId, templates: new Map(), reportTemplateIds: new Set() }
    planned.set(key, link)
    if (!link.templates.has(parent.id)) link.templates.set(parent.id, source)
    link.reportTemplateIds.add(report.id)
  }

  for (const link of planned.values()) {
    const name = `${categoryLabel(link.parentCategoryId)} → ${categoryLabel(link.reportCategoryId)}`
    const existing = links.find((l) => l.parentCategoryId === link.parentCategoryId && l.reportCategoryId === link.reportCategoryId)
    let linkId = existing?.id
    const getLinkId = async () => {
      linkId ??= (await prisma.reportRule.create({ data: { parentCategoryId: link.parentCategoryId, reportCategoryId: link.reportCategoryId } })).id
      return linkId
    }
    if (!existing) actions.push({ describe: `Attach ${name}`, run: async () => { await getLinkId() } })

    // Every template in the parent category keeps its old behaviour
    const base = baseTiming.get(link.reportCategoryId)!
    for (const t of templates.filter((t) => t.formCategoryId === link.parentCategoryId)) {
      if (existing?.overrides.some((o) => o.formTemplateId === t.id)) continue
      const source = link.templates.get(t.id)
      const had = source?.timing
      const diff: Record<string, unknown> = had
        ? {
            ...(had.reportTriggerStatusId !== base.reportTriggerStatusId && { triggerStatusId: had.reportTriggerStatusId }),
            ...(had.reportDueDays !== base.reportDueDays && { dueDays: had.reportDueDays }),
            ...(had.reportPeriodMonths !== base.reportPeriodMonths && { periodMonths: had.reportPeriodMonths }),
            ...(had.reportOpensDaysBefore !== base.reportOpensDaysBefore && { opensDaysBefore: had.reportOpensDaysBefore }),
            ...(had.reportDueDaysAfterPeriodEnd !== base.reportDueDaysAfterPeriodEnd && { dueDaysAfterPeriodEnd: had.reportDueDaysAfterPeriodEnd }),
            ...(!source.active && { enabled: false }),
          }
        : { enabled: false }
      // A blank old setting ("no due date", "Approved") can't be an override value
      if (Object.entries(diff).some(([, v]) => v === null)) {
        problems.push(`${name}: "${t.name}" had a blank setting that differs from the category; check its report settings`)
      }
      const data = Object.fromEntries(Object.entries(diff).filter(([, v]) => v !== null))
      if (Object.keys(data).length === 0) continue
      actions.push({
        describe: had ? `  "${t.name}": change ${JSON.stringify(data)}` : `  "${t.name}": switch off (it didn't have this report)`,
        run: async () => {
          await prisma.reportRuleOverride.create({ data: { ...data, reportRuleId: await getLinkId(), formTemplateId: t.id } })
        },
      })
    }

    // Reports the old settings already created become created planned reports
    const parents = await prisma.localDevelopmentAgencyForm.findMany({
      where: { formTemplateId: { in: [...link.templates.keys()] } },
      select: { id: true, title: true, fundingStart: true, fundingEnd: true, formTemplateId: true },
    })
    const reports = await prisma.localDevelopmentAgencyForm.findMany({
      where: {
        linkedFormId: { in: parents.map((p) => p.id) },
        formTemplateId: { in: [...link.reportTemplateIds] },
        plannedAs: null,
      },
      select: { id: true, title: true, linkedFormId: true, fundingStart: true, fundingEnd: true, dueDate: true },
      orderBy: { id: "asc" },
    })
    const taken = new Set<string>()
    for (const report of reports) {
      const parent = parents.find((p) => p.id === report.linkedFormId)!
      const timing = link.templates.get(parent.formTemplateId)!.timing
      const period = timing.reportKind === "AFTER_STATUS"
        ? { index: 0, label: "" }
        : reportPeriods(parent.fundingStart, parent.fundingEnd, {
            periodMonths: timing.reportPeriodMonths,
            opensDaysBefore: timing.reportOpensDaysBefore,
            dueDaysAfterPeriodEnd: timing.reportDueDaysAfterPeriodEnd,
          }).find((p) => p.start.getTime() <= report.fundingStart.getTime() && report.fundingStart.getTime() <= p.end.getTime() + 86400000 - 1)
      const slot = `${report.linkedFormId}:${period?.index}`
      if (!period || taken.has(slot)) {
        problems.push(`${name}: report #${report.id} "${report.title}" doesn't match a period of "${parent.title}"; left as is`)
        continue
      }
      taken.add(slot)
      actions.push({
        describe: `  record report #${report.id} "${report.title}" as created${period.index ? ` (period ${period.index})` : ""}`,
        run: async () => {
          await prisma.plannedReport.create({
            data: {
              parentFormId: parent.id,
              reportRuleId: await getLinkId(),
              reportCategoryId: link.reportCategoryId,
              period: period.index,
              label: period.label,
              periodStart: report.fundingStart,
              periodEnd: report.fundingEnd,
              dueOn: report.dueDate,
              status: "CREATED",
              reportFormId: report.id,
            },
          })
        },
      })
    }
  }

  console.log(`${sources.length} old setting(s); ${actions.length} change(s):`)
  actions.forEach((a) => console.log(a.describe))
  if (problems.length > 0) {
    console.log(`\n${problems.length} to fix by hand, then run this again:`)
    problems.forEach((p) => console.log(`  ${p}`))
  }

  if (!commit) {
    console.log("\nDry run. Re-run with --commit to apply, then run `yarn plan-reports`.")
    return
  }
  for (const action of actions) await action.run()
  console.log(`\nApplied ${actions.length} change(s). Now run \`yarn plan-reports\` to plan existing forms' remaining reports.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
