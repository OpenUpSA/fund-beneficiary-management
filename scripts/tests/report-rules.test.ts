// Run with: node -r tsx/cjs scripts/tests/report-rules.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const transpile = (file: string) => ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const source = transpile("lib/report-rules.ts")
const formatModule: Record<string, unknown> = {}
runInNewContext(transpile("lib/report-rule-format.ts"), { exports: formatModule })

// Values built inside the vm sandbox have that realm's prototypes; compare plain copies
const same = (actual: unknown, expected: unknown, message?: string) =>
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message)

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)

const STATUS = {
  Draft: { id: 1, label: "Draft" },
  Approved: { id: 2, label: "Approved" },
  UnderReview: { id: 8, label: "UnderReview" },
  Underway: { id: 6, label: "Underway" },
  Rejected: { id: 7, label: "Rejected" },
  Paused: { id: 9, label: "Paused" },
}

type Rule = Record<string, unknown> & { id: number; overrides: Array<Record<string, unknown>> }
type Form = Record<string, unknown> & { id: number }

function load(state: { rules?: Rule[]; parents?: Form[]; reports?: Form[]; templates?: Array<Record<string, unknown>> } = {}) {
  const reports: Form[] = state.reports ?? []
  const templates = state.templates ?? [
    { id: 50, name: "Narrative Report 2025", formCategoryId: 5, active: true, createdAt: d("2025-01-01") },
    { id: 51, name: "Narrative Report 2026", formCategoryId: 5, active: true, createdAt: d("2026-01-01") },
    { id: 52, name: "Narrative Report (old)", formCategoryId: 5, active: false, createdAt: d("2027-01-01") },
    { id: 60, name: "Short Narrative Report", formCategoryId: 5, active: true, createdAt: d("2024-01-01") },
  ]
  let nextId = 1000
  const prisma = {
    reportRule: { findMany: async () => state.rules ?? [] },
    formStatus: {
      findFirst: async () => ({ id: STATUS.Draft.id }),
      findUnique: async ({ where }: { where: { id: number } }) => Object.values(STATUS).find((s) => s.id === where.id) ?? null,
    },
    formCategory: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        ({ 1: { role: "PRIMARY" }, 3: { role: "SECONDARY" }, 5: { role: "REPORT" } } as Record<number, { role: string }>)[where.id] ?? null,
    },
    formTemplate: {
      findUnique: async ({ where }: { where: { id: number } }) => templates.find((t) => t.id === where.id) ?? null,
      findFirst: async ({ where }: { where: { formCategoryId: number; active: boolean } }) =>
        templates
          .filter((t) => t.formCategoryId === where.formCategoryId && t.active === where.active)
          .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())[0] ?? null,
    },
    localDevelopmentAgencyForm: {
      findMany: async ({ where }: { where: Record<string, any> }) => {
        if (where.reportRuleId !== undefined) {
          return reports.filter((r) => r.reportRuleId === where.reportRuleId && where.linkedFormId.in.includes(r.linkedFormId))
        }
        return (state.parents ?? []).filter((p) =>
          p.categoryId === where.formTemplate.formCategoryId && (where.id === undefined || p.id === where.id))
      },
      create: async ({ data }: { data: Form }) => {
        if (reports.some((r) => r.linkedFormId === data.linkedFormId && r.reportRuleId === data.reportRuleId && r.reportPeriod === data.reportPeriod)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
        }
        const row = { ...data, id: nextId++ }
        reports.push(row)
        return { id: row.id, title: row.title }
      },
    },
  }
  const exports: Record<string, unknown> = {}
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/report-rule-format") return formatModule
      assert.equal(name, "@/db", `Unexpected dependency: ${name}`)
      return { default: prisma }
    },
  })
  return { lib: exports as unknown as typeof import("../../lib/report-rules"), reports }
}

const quarterly = {
  id: 1,
  kind: "PERIODIC",
  active: true,
  parentCategoryId: 1,
  reportCategoryId: 5,
  triggerStatusId: null,
  dueDays: null,
  periodMonths: 3,
  opensDaysBefore: 14,
  dueDaysAfterPeriodEnd: 15,
  overrides: [],
}
const grant = (id: number, status = STATUS.Approved, extra: Record<string, unknown> = {}): Form => ({
  id,
  title: `Grant ${id}`,
  categoryId: 1,
  localDevelopmentAgencyId: 7,
  fundingStart: d("2026-04-01"),
  fundingEnd: d("2027-03-31"),
  primaryFormId: null,
  formTemplateId: 10,
  formStatus: status,
  formTemplate: { category: { role: "PRIMARY" } },
  ...extra,
})

async function main() {
  const { lib } = load()

  // Periods split the parent's own funding period (an April–March grant gets April quarters)
  const q = lib.reportPeriods(d("2026-04-01"), d("2027-03-31"), { periodMonths: 3, opensDaysBefore: 14, dueDaysAfterPeriodEnd: 15 })
  same(q.map((p) => [p.index, iso(p.start), iso(p.end), p.label]), [
    [1, "2026-04-01", "2026-06-30", "Q1 2026"],
    [2, "2026-07-01", "2026-09-30", "Q2 2026"],
    [3, "2026-10-01", "2026-12-31", "Q3 2026"],
    [4, "2027-01-01", "2027-03-31", "Q4 2027"],
  ])
  assert.equal(iso(q[0].opensOn), "2026-06-16")
  assert.equal(iso(q[0].dueOn), "2026-07-15")

  // A funding period that isn't a whole number of periods ends with a short one
  const h = lib.reportPeriods(d("2026-01-01"), d("2026-08-15"), { periodMonths: 6, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 })
  same(h.map((p) => [iso(p.start), iso(p.end), p.label]), [
    ["2026-01-01", "2026-06-30", "H1 2026"],
    ["2026-07-01", "2026-08-15", "H2 2026"],
  ])
  // Custom lengths, yearly and month-end starts
  same(lib.reportPeriods(d("2026-01-01"), d("2026-12-31"), { periodMonths: 4, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }).map((p) => p.label), ["Period 1", "Period 2", "Period 3"])
  same(lib.reportPeriods(d("2026-01-01"), d("2027-12-31"), { periodMonths: 12, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }).map((p) => p.label), ["Year 1", "Year 2"])
  same(lib.reportPeriods(d("2026-01-31"), d("2026-04-29"), { periodMonths: 1, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }).map((p) => iso(p.start)), ["2026-01-31", "2026-02-28", "2026-03-31"])
  same(lib.reportPeriods(d("2026-01-01"), d("2026-12-31"), { periodMonths: null, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }), [])
  same(lib.reportPeriods(d("2026-12-31"), d("2026-01-01"), { periodMonths: 3, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }), [], "End before start")

  // Template overrides win field by field; unset fields inherit; a disabled rule stays disabled
  const base = { ...quarterly, kind: "PERIODIC" as const }
  same(lib.effectiveRule(base, null), {
    kind: "PERIODIC", reportCategoryId: 5, enabled: true, triggerStatusId: null, dueDays: null,
    periodMonths: 3, opensDaysBefore: 14, dueDaysAfterPeriodEnd: 15, reportTemplateId: null,
  })
  const overridden = lib.effectiveRule(base, {
    enabled: null, triggerStatusId: 8, dueDays: null, periodMonths: 6, opensDaysBefore: 0, dueDaysAfterPeriodEnd: null, reportTemplateId: 60,
  })
  assert.equal(overridden.periodMonths, 6)
  assert.equal(overridden.opensDaysBefore, 0, "Zero is a real override, not 'unset'")
  assert.equal(overridden.dueDaysAfterPeriodEnd, 15)
  assert.equal(overridden.triggerStatusId, 8)
  assert.equal(overridden.reportTemplateId, 60)
  assert.equal(lib.effectiveRule(base, { ...overridden, enabled: false } as never).enabled, false)
  assert.equal(lib.effectiveRule({ ...base, active: false }, { enabled: true } as never).enabled, false, "An inactive rule can't be switched on by a template")

  // Triggers: the status itself or any approved status; never Draft, Rejected or Paused
  assert.equal(lib.triggerReached(STATUS.Approved, null), true)
  assert.equal(lib.triggerReached(STATUS.Underway, null), true)
  assert.equal(lib.triggerReached(STATUS.UnderReview, null), false)
  assert.equal(lib.triggerReached(STATUS.UnderReview, STATUS.UnderReview.id), true)
  assert.equal(lib.triggerReached(STATUS.Approved, STATUS.UnderReview.id), true, "Approval comes after submission")
  assert.equal(lib.triggerReached(STATUS.Rejected, null), false)
  assert.equal(lib.triggerReached(STATUS.Paused, STATUS.UnderReview.id), false)
  assert.equal(lib.triggerReached(STATUS.Draft, null), false)

  // Generation: every opened period is created once, from the newest active template
  {
    const { lib, reports } = load({ rules: [quarterly], parents: [grant(100)] })
    const first = await lib.generateDueReports(d("2026-10-20"))
    same(first.errors, [])
    assert.equal(first.created, 2, "Q1 and Q2 have opened; catch-up creates both")
    same(reports.map((r) => [r.reportPeriod, r.title, iso(r.dueDate as Date), r.linkedFormId, r.primaryFormId, r.formTemplateId]), [
      [1, "Narrative Report 2026 – Q1 2026", "2026-07-15", 100, 100, 51],
      [2, "Narrative Report 2026 – Q2 2026", "2026-10-15", 100, 100, 51],
    ])
    assert.equal(iso(reports[0].fundingStart as Date), "2026-04-01")

    const again = await lib.generateDueReports(d("2026-10-20"))
    assert.equal(again.created, 0, "Running twice creates nothing new")

    const later = await lib.generateDueReports(d("2026-12-17"))
    assert.equal(later.created, 1, "Q3 opens 14 days before 31 Dec")
    assert.equal(reports.length, 3)
  }

  // Parents that haven't reached the trigger, or are rejected/paused, get nothing
  {
    const { lib, reports } = load({
      rules: [quarterly],
      parents: [grant(101, STATUS.UnderReview), grant(102, STATUS.Rejected), grant(103, STATUS.Paused), grant(104, STATUS.Draft)],
    })
    await lib.generateDueReports(d("2027-06-01"))
    assert.equal(reports.length, 0)
  }

  // Template overrides: switched off, different frequency, earlier trigger, pinned template
  {
    const rule = {
      ...quarterly,
      overrides: [
        { formTemplateId: 11, enabled: false },
        { formTemplateId: 12, periodMonths: 6, triggerStatusId: STATUS.UnderReview.id, reportTemplateId: 60 },
      ],
    }
    const { lib, reports } = load({
      rules: [rule],
      parents: [grant(110, STATUS.Approved, { formTemplateId: 11 }), grant(111, STATUS.UnderReview, { formTemplateId: 12 })],
    })
    await lib.generateDueReports(d("2026-10-20"))
    same(reports.map((r) => [r.linkedFormId, r.title, r.formTemplateId]), [
      [111, "Short Narrative Report – H1 2026", 60],
    ])
  }

  // Secondary parents group their reports under their own primary; one parent at a time
  {
    const dft = grant(120, STATUS.Approved, { primaryFormId: 100, formTemplate: { category: { role: "SECONDARY" } } })
    const { lib, reports } = load({ rules: [quarterly], parents: [dft, grant(121)] })
    await lib.generateDueReports(d("2026-07-01"), 120)
    same(reports.map((r) => [r.linkedFormId, r.primaryFormId]), [[120, 100]])
  }

  // A race with another run is skipped, not an error; a missing template is reported
  {
    const { lib } = load({
      rules: [quarterly],
      parents: [grant(130)],
      reports: [{ id: 1, linkedFormId: 130, reportRuleId: 2, reportPeriod: 1 }],
    })
    const noTemplate = load({ rules: [quarterly], parents: [grant(131)], templates: [] })
    const missing = await noTemplate.lib.generateDueReports(d("2026-07-01"))
    assert.equal(missing.created, 0)
    assert.match(missing.errors[0], /no active template/)
    assert.equal((await lib.generateDueReports(d("2026-07-01"))).created, 1, "Another rule's report doesn't block this one")
  }

  // Rule validation: categories by role, kinds, number ranges, statuses; categories/kind fixed once created
  {
    const { lib } = load()
    const rule = { parentCategoryId: 1, reportCategoryId: 5, kind: "PERIODIC", periodMonths: 3 }
    assert.equal(await lib.reportRuleInputError(rule), undefined)
    assert.equal(await lib.reportRuleInputError({ parentCategoryId: 3, reportCategoryId: 5, kind: "AFTER_STATUS", dueDays: 30 }), undefined)
    assert.match((await lib.reportRuleInputError({ ...rule, parentCategoryId: 5 }))!, /primary or secondary/)
    assert.match((await lib.reportRuleInputError({ ...rule, reportCategoryId: 1 }))!, /report category/)
    assert.ok(await lib.reportRuleInputError({ ...rule, kind: "WEEKLY" }))
    assert.match((await lib.reportRuleInputError({ ...rule, periodMonths: null }))!, /frequency/)
    assert.ok(await lib.reportRuleInputError({ ...rule, periodMonths: 0 }))
    assert.ok(await lib.reportRuleInputError({ ...rule, opensDaysBefore: -1 }))
    assert.equal(await lib.reportRuleInputError({ ...rule, dueDaysAfterPeriodEnd: -10 }), undefined, "Due before the period ends is allowed")
    assert.ok(await lib.reportRuleInputError({ ...rule, triggerStatusId: 404 }))
    const existing = { kind: "PERIODIC", periodMonths: 3 }
    assert.equal(await lib.reportRuleInputError({ opensDaysBefore: 7, active: false }, existing), undefined)
    assert.match((await lib.reportRuleInputError({ kind: "AFTER_STATUS" }, existing))!, /add a new one/)

    // Overrides: same ranges; a pinned report template must be in the rule's report category
    assert.equal(await lib.reportOverrideInputError({ enabled: false, periodMonths: 6, reportTemplateId: 60 }, { reportCategoryId: 5 }), undefined)
    assert.match((await lib.reportOverrideInputError({ reportTemplateId: 60 }, { reportCategoryId: 4 }))!, /report category/)
    assert.ok(await lib.reportOverrideInputError({ dueDays: 1.5 }, { reportCategoryId: 5 }))
    assert.ok(await lib.reportOverrideInputError({ enabled: "no" }, { reportCategoryId: 5 }))
  }

  console.log("report-rules: periods, overrides, triggers, catch-up, idempotency, blocked parents, template choice and validation passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
