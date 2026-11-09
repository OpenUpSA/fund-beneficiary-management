/**
 * Convert the old report settings into report rules on categories.
 *
 *  - A template's "linked form template" (one report after a status) becomes an
 *    after-status rule between the two templates' categories.
 *  - Each report schedule config (quarterly, … on an application template)
 *    becomes a periodic rule between the two templates' categories.
 *
 * Several templates of one category may have had different settings. The newest
 * becomes the category default; any template whose settings differ gets a
 * template override, and templates in the category that never had the report
 * get an "off" override, so every template keeps behaving as before.
 * Existing linked/scheduled reports are tagged with their rule and period so
 * the daily job doesn't create them again.
 *
 * Templates need a category first (Form templates → Categories). The dry run
 * lists any that are missing.
 *
 *   yarn migrate-report-rules            # dry run, prints everything it would do
 *   yarn migrate-report-rules --commit   # apply
 */
import prisma from "../db"
import { reportPeriods } from "../lib/report-rules"

const commit = process.argv.includes("--commit")

const MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, BIANNUALLY: 6, ANNUALLY: 12 }

interface Source {
  description: string
  parentTemplateId: number
  reportTemplateId: number
  kind: "AFTER_STATUS" | "PERIODIC"
  settings: {
    triggerStatusId: number | null
    dueDays: number | null
    periodMonths: number | null
    opensDaysBefore: number
    dueDaysAfterPeriodEnd: number
    active: boolean
  }
}

type RuleKey = string
const ruleKey = (parentCategoryId: number, reportCategoryId: number, kind: string, periodMonths: number | null) =>
  `${parentCategoryId}:${reportCategoryId}:${kind}:${periodMonths ?? ""}`

async function main() {
  const [templates, configs, existingRules] = await Promise.all([
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
    prisma.reportRule.findMany({ include: { overrides: true } }),
  ])
  const template = (id: number) => templates.find((t) => t.id === id)!

  // Newest first, so the first source of each rule becomes its default
  const sources: Source[] = [
    ...templates
      .filter((t) => t.linkedFormTemplateId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t): Source => ({
        description: `"${t.name}" linked form → "${template(t.linkedFormTemplateId!).name}"`,
        parentTemplateId: t.id,
        reportTemplateId: t.linkedFormTemplateId!,
        kind: "AFTER_STATUS",
        settings: {
          triggerStatusId: t.linkedFormTriggerStatusId,
          dueDays: t.linkedFormDueDays,
          periodMonths: null,
          opensDaysBefore: 14,
          dueDaysAfterPeriodEnd: 0,
          active: true,
        },
      })),
    ...[...configs].reverse().map((c): Source => ({
      description: `"${template(c.applicationTemplateId).name}" ${c.frequency.toLowerCase()} schedule → "${template(c.reportTemplateId).name}"`,
      parentTemplateId: c.applicationTemplateId,
      reportTemplateId: c.reportTemplateId,
      kind: "PERIODIC",
      settings: {
        triggerStatusId: null,
        dueDays: null,
        periodMonths: MONTHS[c.frequency],
        opensDaysBefore: c.availableDaysBefore,
        dueDaysAfterPeriodEnd: c.dueDaysAfterPeriodEnd,
        active: c.active,
      },
    })),
  ]

  const problems: string[] = []
  // Per rule: its default settings, the templates that had it, and per-template differences
  const planned = new Map<RuleKey, {
    parentCategoryId: number
    reportCategoryId: number
    kind: Source["kind"]
    settings: Source["settings"]
    existingRuleId?: number
    templates: Map<number, Source["settings"]>
    reportTemplateIds: Set<number>
  }>()

  for (const source of sources) {
    const parent = template(source.parentTemplateId)
    const report = template(source.reportTemplateId)
    if (!parent.formCategoryId || !report.formCategoryId) {
      problems.push(`${source.description}: assign a category to ${[!parent.formCategoryId && `"${parent.name}"`, !report.formCategoryId && `"${report.name}"`].filter(Boolean).join(" and ")}`)
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
    const key = ruleKey(parent.formCategoryId, report.formCategoryId, source.kind, source.settings.periodMonths)
    let rule = planned.get(key)
    if (!rule) {
      const existing = existingRules.find((r) =>
        ruleKey(r.parentCategoryId, r.reportCategoryId, r.kind, r.periodMonths) === key)
      rule = {
        parentCategoryId: parent.formCategoryId,
        reportCategoryId: report.formCategoryId,
        kind: source.kind,
        settings: existing ?? source.settings,
        existingRuleId: existing?.id,
        templates: new Map(),
        reportTemplateIds: new Set(),
      }
      planned.set(key, rule)
    }
    if (!rule.templates.has(parent.id)) rule.templates.set(parent.id, source.settings)
    rule.reportTemplateIds.add(report.id)
  }

  // Work out the rules, overrides and report tags to write
  const actions: Array<{ describe: string; run: () => Promise<void> }> = []
  for (const rule of planned.values()) {
    const label = (id: number) => templates.find((t) => t.formCategoryId === id)?.category?.label ?? `#${id}`
    const name = `${label(rule.parentCategoryId)} → ${label(rule.reportCategoryId)} (${rule.kind === "PERIODIC" ? `every ${rule.settings.periodMonths} months` : "after a status"})`
    let ruleId = rule.existingRuleId
    const getRuleId = async () => {
      if (!ruleId) {
        const created = await prisma.reportRule.create({
          data: {
            parentCategoryId: rule.parentCategoryId,
            reportCategoryId: rule.reportCategoryId,
            kind: rule.kind,
            triggerStatusId: rule.settings.triggerStatusId,
            dueDays: rule.settings.dueDays,
            periodMonths: rule.settings.periodMonths,
            opensDaysBefore: rule.settings.opensDaysBefore,
            dueDaysAfterPeriodEnd: rule.settings.dueDaysAfterPeriodEnd,
            active: rule.settings.active,
          },
        })
        ruleId = created.id
      }
      return ruleId
    }
    if (!ruleId) actions.push({ describe: `Create rule ${name}`, run: async () => { await getRuleId() } })

    const existingOverrides = existingRules.find((r) => r.id === ruleId)?.overrides ?? []
    for (const t of templates.filter((t) => t.formCategoryId === rule.parentCategoryId)) {
      if (existingOverrides.some((o) => o.formTemplateId === t.id)) continue
      const had = rule.templates.get(t.id)
      const diff = had
        ? {
            ...(had.triggerStatusId !== rule.settings.triggerStatusId && { triggerStatusId: had.triggerStatusId }),
            ...(had.dueDays !== rule.settings.dueDays && { dueDays: had.dueDays }),
            ...(had.opensDaysBefore !== rule.settings.opensDaysBefore && { opensDaysBefore: had.opensDaysBefore }),
            ...(had.dueDaysAfterPeriodEnd !== rule.settings.dueDaysAfterPeriodEnd && { dueDaysAfterPeriodEnd: had.dueDaysAfterPeriodEnd }),
            ...(had.active !== rule.settings.active && { enabled: had.active }),
          }
        : { enabled: false }
      // Null in the old settings ("no due date", "Approved") can't be expressed as an override value
      const unexpressible = had && Object.entries(diff).some(([k, v]) => v === null && k !== "enabled")
      if (unexpressible) problems.push(`${name}: "${t.name}" used a blank setting that differs from the default; check its report settings`)
      const data = Object.fromEntries(Object.entries(diff).filter(([, v]) => v !== null))
      if (Object.keys(data).length === 0) continue
      actions.push({
        describe: had
          ? `  "${t.name}": override ${JSON.stringify(data)}`
          : `  "${t.name}": switch off (it didn't have this report)`,
        run: async () => {
          await prisma.reportRuleOverride.create({ data: { ...data, reportRuleId: await getRuleId(), formTemplateId: t.id } })
        },
      })
    }

    // Tag the reports these settings already created, so they aren't created again
    const parents = await prisma.localDevelopmentAgencyForm.findMany({
      where: { formTemplateId: { in: [...rule.templates.keys()] } },
      select: { id: true, title: true, fundingStart: true, fundingEnd: true },
    })
    const reports = await prisma.localDevelopmentAgencyForm.findMany({
      where: {
        linkedFormId: { in: parents.map((p) => p.id) },
        formTemplateId: { in: [...rule.reportTemplateIds] },
        reportRuleId: null,
      },
      select: { id: true, title: true, linkedFormId: true, fundingStart: true },
      orderBy: { id: "asc" },
    })
    const taken = new Set<string>()
    for (const report of reports) {
      const parent = parents.find((p) => p.id === report.linkedFormId)!
      const period = rule.kind === "AFTER_STATUS"
        ? 0
        : reportPeriods(parent.fundingStart, parent.fundingEnd, rule.settings)
            .find((p) => p.start <= report.fundingStart && report.fundingStart <= new Date(p.end.getTime() + 86400000 - 1))?.index
      const slot = `${report.linkedFormId}:${period}`
      if (period === undefined || taken.has(slot)) {
        problems.push(`${name}: report #${report.id} "${report.title}" doesn't match a period of "${parent.title}"; left untagged`)
        continue
      }
      taken.add(slot)
      actions.push({
        describe: `  tag report #${report.id} "${report.title}" as period ${period}`,
        run: async () => {
          await prisma.localDevelopmentAgencyForm.update({
            where: { id: report.id },
            data: { reportRuleId: await getRuleId(), reportPeriod: period },
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
    console.log("\nDry run. Re-run with --commit to apply.")
    return
  }
  for (const action of actions) await action.run()
  console.log(`\nApplied ${actions.length} change(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
