// Run with: node -r tsx/cjs scripts/tests/report-rules.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { effectiveTiming, plannedRows, reportPeriods, triggerReached, type CategoryTiming } from "../../lib/report-timing"

const transpile = (file: string) => ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loadPure = (file: string) => {
  const exports: Record<string, unknown> = {}
  runInNewContext(transpile(file), { exports })
  return exports
}
const formatModule = loadPure("lib/report-rule-format.ts")
const timingModule = loadPure("lib/report-timing.ts")
const source = transpile("lib/report-rules.ts")

// Values built inside the vm sandbox have that realm's prototypes; compare plain copies
const same = (actual: unknown, expected: unknown, message?: string) =>
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message)
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString().slice(0, 10) : null)

const STATUS = {
  Draft: { id: 1, label: "Draft" },
  Approved: { id: 2, label: "Approved" },
  Underway: { id: 6, label: "Underway" },
  Rejected: { id: 7, label: "Rejected" },
  UnderReview: { id: 8, label: "UnderReview" },
  Paused: { id: 9, label: "Paused" },
}

const QUARTERLY: CategoryTiming = {
  reportKind: "PERIODIC",
  reportTriggerStatusId: null,
  reportDueDays: null,
  reportPeriodMonths: 3,
  reportOpensDaysBefore: 14,
  reportDueDaysAfterPeriodEnd: 15,
}
const AFTER_APPROVAL: CategoryTiming = {
  reportKind: "AFTER_STATUS",
  reportTriggerStatusId: null,
  reportDueDays: 30,
  reportPeriodMonths: null,
  reportOpensDaysBefore: 14,
  reportDueDaysAfterPeriodEnd: 0,
}

// ─── In-memory database ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "OR") return (cond as Row[]).some((c) => matches(row, c))
    const value = row[key]
    if (cond === null || typeof cond !== "object" || cond instanceof Date) {
      return cond instanceof Date ? value?.getTime() === cond.getTime() : value === cond
    }
    if ("not" in cond) return value !== cond.not
    if ("in" in cond) return cond.in.includes(value)
    if (value == null) return false
    const time = value instanceof Date ? value.getTime() : value
    if (cond.lte !== undefined && !(time <= cond.lte.getTime())) return false
    if (cond.gte !== undefined && !(time >= cond.gte.getTime())) return false
    if (cond.gt !== undefined && !(time > cond.gt.getTime())) return false
    return true
  })
}

interface World {
  forms: Row[]
  planned: Row[]
  links: Row[]
  categories: Row[]
  templates: Row[]
}

function load(world: Partial<World>) {
  const db: World = {
    forms: world.forms ?? [],
    planned: world.planned ?? [],
    links: world.links ?? [],
    categories: world.categories ?? [
      { id: 1, label: "Grant Funding", role: "PRIMARY" },
      { id: 3, label: "DFT Application", role: "SECONDARY" },
      { id: 5, label: "Narrative Report", role: "REPORT", ...QUARTERLY },
      { id: 6, label: "DFT Report", role: "REPORT", ...AFTER_APPROVAL },
    ],
    templates: world.templates ?? [
      { id: 10, formCategoryId: 1, name: "Grant Funding 2026", active: true, createdAt: d("2026-01-01") },
      { id: 11, formCategoryId: 1, name: "Grant Funding (on submission)", active: true, createdAt: d("2026-01-02") },
      { id: 50, formCategoryId: 5, name: "Narrative Report 2025", active: true, createdAt: d("2025-01-01") },
      { id: 51, formCategoryId: 5, name: "Narrative Report 2026", active: true, createdAt: d("2026-01-01") },
      { id: 52, formCategoryId: 5, name: "Narrative Report (old)", active: false, createdAt: d("2027-01-01") },
      { id: 60, formCategoryId: 5, name: "Short Narrative Report", active: true, createdAt: d("2024-01-01") },
      { id: 70, formCategoryId: 6, name: "DFT Report", active: true, createdAt: d("2026-01-01") },
    ],
  }
  let nextId = 1000
  const status = (id: number) => Object.values(STATUS).find((s) => s.id === id)!
  const category = (id: number) => db.categories.find((c) => c.id === id)!
  const template = (id: number) => db.templates.find((t) => t.id === id)!
  const form = (id: number) => db.forms.find((f) => f.id === id)!

  const formView = (f: Row) => ({
    ...f,
    formStatus: status(f.formStatusId),
    formTemplate: { formCategoryId: template(f.formTemplateId).formCategoryId, category: category(template(f.formTemplateId).formCategoryId) },
    localDevelopmentAgency: { name: `LDA ${f.localDevelopmentAgencyId}` },
  })
  const plannedView = (p: Row) => ({
    ...p,
    reportCategory: category(p.reportCategoryId),
    parentForm: formView(form(p.parentFormId)),
    reportForm: p.reportFormId && form(p.reportFormId) ? formView(form(p.reportFormId)) : null,
  })

  const prisma: Row = {
    $transaction: async (fn: (tx: Row) => Promise<unknown>) => fn(prisma),
    formStatus: {
      findFirst: async ({ where }: Row) => Object.values(STATUS).find((s) => s.label === where.label) ?? null,
      findMany: async ({ where }: Row) => Object.values(STATUS).filter((s) => where.label.in.includes(s.label)),
      findUnique: async ({ where }: Row) => Object.values(STATUS).find((s) => s.id === where.id) ?? null,
    },
    formCategory: {
      findUnique: async ({ where }: Row) => db.categories.find((c) => c.id === where.id) ?? null,
    },
    formTemplate: {
      findUnique: async ({ where }: Row) => db.templates.find((t) => t.id === where.id) ?? null,
      findFirst: async ({ where }: Row) =>
        db.templates
          .filter((t) => t.formCategoryId === where.formCategoryId && t.active === where.active)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
    },
    reportRule: {
      // The real query filters overrides to the form's template; links in these tests only hold that template's
      findMany: async ({ where }: Row) =>
        db.links.filter((l) => l.parentCategoryId === where.parentCategoryId).map((l) => ({
          ...l,
          reportCategory: category(l.reportCategoryId),
          overrides: l.overrides ?? [],
        })),
    },
    localDevelopmentAgencyForm: {
      findUnique: async ({ where }: Row) => (form(where.id) ? formView(form(where.id)) : null),
      create: async ({ data }: Row) => {
        const row = { ...data, id: nextId++ }
        db.forms.push(row)
        return { id: row.id, title: row.title }
      },
      update: async ({ where, data }: Row) => Object.assign(form(where.id), data),
    },
    plannedReport: {
      count: async ({ where }: Row) => db.planned.filter((p) => matches(p, where)).length,
      createMany: async ({ data }: Row) => {
        for (const row of data) db.planned.push({ status: "PLANNED", edited: false, reportFormId: null, ...row, id: nextId++ })
        return { count: data.length }
      },
      deleteMany: async ({ where }: Row) => {
        const before = db.planned.length
        db.planned = db.planned.filter((p) => !matches(p, where))
        return { count: before - db.planned.length }
      },
      findMany: async ({ where }: Row) =>
        db.planned
          .filter((p) => matches(p, where))
          .sort((a, b) => (a.opensOn?.getTime() ?? 0) - (b.opensOn?.getTime() ?? 0) || a.id - b.id)
          .map(plannedView),
      findUniqueOrThrow: async ({ where }: Row) => plannedView(db.planned.find((p) => p.id === where.id)!),
      updateMany: async ({ where, data }: Row) => {
        const hit = db.planned.filter((p) => matches(p, where))
        hit.forEach((p) => Object.assign(p, data))
        return { count: hit.length }
      },
      update: async ({ where, data }: Row) => Object.assign(db.planned.find((p) => p.id === where.id)!, data),
    },
  }

  const exports: Record<string, unknown> = {}
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/report-rule-format") return formatModule
      if (name === "@/lib/report-timing") return timingModule
      assert.equal(name, "@/db", `Unexpected dependency: ${name}`)
      return { default: prisma }
    },
  })
  return { lib: exports as unknown as typeof import("../../lib/report-rules"), db }
}

const grantForm = (id: number, extra: Row = {}): Row => ({
  id,
  title: `Grant ${id}`,
  localDevelopmentAgencyId: 7,
  formTemplateId: 10,
  formStatusId: STATUS.Draft.id,
  fundingStart: d("2026-04-01"),
  fundingEnd: d("2027-03-31"),
  primaryFormId: null,
  ...extra,
})
const narrativeLink = { id: 1, parentCategoryId: 1, reportCategoryId: 5, overrides: [] as Row[] }
const dftLink = { id: 2, parentCategoryId: 1, reportCategoryId: 6, overrides: [] as Row[] }
const rowsOf = (db: World, parentFormId: number) =>
  db.planned.filter((p) => p.parentFormId === parentFormId).sort((a, b) => (a.period ?? 99) - (b.period ?? 99))

async function main() {
  // ─── Pure timing ───────────────────────────────────────────────────────────

  // Periods split the parent's own funding period (an April–March grant gets April quarters)
  const q = reportPeriods(d("2026-04-01"), d("2027-03-31"), { periodMonths: 3, opensDaysBefore: 14, dueDaysAfterPeriodEnd: 15 })
  same(q.map((p) => [p.index, iso(p.start), iso(p.end), p.label, iso(p.opensOn), iso(p.dueOn)]), [
    [1, "2026-04-01", "2026-06-30", "Q1 2026", "2026-06-16", "2026-07-15"],
    [2, "2026-07-01", "2026-09-30", "Q2 2026", "2026-09-16", "2026-10-15"],
    [3, "2026-10-01", "2026-12-31", "Q3 2026", "2026-12-17", "2027-01-15"],
    [4, "2027-01-01", "2027-03-31", "Q4 2027", "2027-03-17", "2027-04-15"],
  ])
  same(reportPeriods(d("2026-01-01"), d("2026-08-15"), { periodMonths: 6, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 })
    .map((p) => [iso(p.start), iso(p.end), p.label]), [["2026-01-01", "2026-06-30", "H1 2026"], ["2026-07-01", "2026-08-15", "H2 2026"]])
  // Quarter numbers restart every 12 months of the form; the year is the period's start
  same(reportPeriods(d("2026-04-01"), d("2028-03-31"), { periodMonths: 3, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }).map((p) => p.label),
    ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2027", "Q1 2027", "Q2 2027", "Q3 2027", "Q4 2028"])
  same(reportPeriods(d("2026-01-01"), d("2027-12-31"), { periodMonths: 6, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }).map((p) => p.label), ["H1 2026", "H2 2026", "H1 2027", "H2 2027"])
  same(reportPeriods(d("2026-01-01"), d("2027-12-31"), { periodMonths: 12, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }).map((p) => p.label), ["Year 1", "Year 2"])
  // 31 Jan + 3 months keeps the day where it can: 30 Apr, then 31 Jul
  same(reportPeriods(d("2026-01-31"), d("2026-10-29"), { periodMonths: 3, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }).map((p) => iso(p.start)), ["2026-01-31", "2026-04-30", "2026-07-31"])
  same(reportPeriods(d("2026-12-31"), d("2026-01-01"), { periodMonths: 3, opensDaysBefore: 0, dueDaysAfterPeriodEnd: 0 }), [], "End before start")

  // A template can only switch a report off or change its trigger status; no timing on the category means no reports
  const base = effectiveTiming(QUARTERLY)!
  same(base, { kind: "PERIODIC", enabled: true, triggerStatusId: null, dueDays: null, periodMonths: 3, opensDaysBefore: 14, dueDaysAfterPeriodEnd: 15 })
  same(effectiveTiming(QUARTERLY, { enabled: true, triggerStatusId: 8 }), { ...base, triggerStatusId: 8 })
  same(effectiveTiming(QUARTERLY, { enabled: true, triggerStatusId: null }), base, "No status change keeps the category's")
  assert.equal(effectiveTiming(QUARTERLY, { enabled: false, triggerStatusId: null })!.enabled, false)
  assert.equal(effectiveTiming({ ...QUARTERLY, reportKind: null }), null)

  // Rows: one per period, or one after-status row that opens on the trigger
  same(plannedRows({ fundingStart: d("2026-01-01"), fundingEnd: d("2026-12-31") }, effectiveTiming(AFTER_APPROVAL)!), [{
    period: 0, label: "", triggerStatusId: null, periodStart: "2026-01-01T00:00:00.000Z", periodEnd: "2026-12-31T00:00:00.000Z",
    opensOn: null, dueOn: null, dueDays: 30,
  }])
  assert.equal(plannedRows({ fundingStart: d("2026-01-01"), fundingEnd: d("2026-12-31") }, { ...base, enabled: false }).length, 0)

  // Triggers: the status itself or any approved status; never Draft, Rejected or Paused
  assert.equal(triggerReached(STATUS.Approved, null), true)
  assert.equal(triggerReached(STATUS.Underway, null), true)
  assert.equal(triggerReached(STATUS.UnderReview, null), false)
  assert.equal(triggerReached(STATUS.UnderReview, STATUS.UnderReview.id), true)
  assert.equal(triggerReached(STATUS.Approved, STATUS.UnderReview.id), true, "Approval comes after submission")
  assert.equal(triggerReached(STATUS.Rejected, null), false)
  assert.equal(triggerReached(STATUS.Paused, STATUS.UnderReview.id), false)

  // ─── Planning ──────────────────────────────────────────────────────────────

  // A new form gets its reports planned with real dates, once
  {
    const { lib, db } = load({ forms: [grantForm(100)], links: [narrativeLink, dftLink] })
    assert.equal(await lib.planReports(100), 5)
    same(rowsOf(db, 100).map((r) => [r.reportRuleId, r.period, r.label, iso(r.opensOn), iso(r.dueOn), r.dueDays, r.status]), [
      [2, 0, "", null, null, 30, "PLANNED"],
      [1, 1, "Q1 2026", "2026-06-16", "2026-07-15", null, "PLANNED"],
      [1, 2, "Q2 2026", "2026-09-16", "2026-10-15", null, "PLANNED"],
      [1, 3, "Q3 2026", "2026-12-17", "2027-01-15", null, "PLANNED"],
      [1, 4, "Q4 2027", "2027-03-17", "2027-04-15", null, "PLANNED"],
    ])
    assert.equal(await lib.planReports(100), 0, "Planning twice adds nothing")
  }

  // Template changes: a different trigger status; a report switched off for the template plans nothing
  {
    const link = { ...narrativeLink, overrides: [{ formTemplateId: 11, enabled: true, triggerStatusId: STATUS.UnderReview.id }] }
    const { lib, db } = load({ forms: [grantForm(101, { formTemplateId: 11 })], links: [link, { ...dftLink, overrides: [{ formTemplateId: 11, enabled: false, triggerStatusId: null }] }] })
    await lib.planReports(101)
    same(rowsOf(db, 101).map((r) => [r.reportCategoryId, r.label, r.triggerStatusId]), [
      [5, "Q1 2026", STATUS.UnderReview.id],
      [5, "Q2 2026", STATUS.UnderReview.id],
      [5, "Q3 2026", STATUS.UnderReview.id],
      [5, "Q4 2027", STATUS.UnderReview.id],
    ], "Narrative Report keeps the category's quarters at the template's status; DFT Report is off")
    const off = load({ forms: [grantForm(102)], links: [{ ...narrativeLink, overrides: [{ formTemplateId: 10, enabled: false, triggerStatusId: null }] }] })
    assert.equal(await off.lib.planReports(102), 0)
  }

  // Recalculating after a date change keeps created, skipped, edited and detached rows, and doesn't overlap them
  {
    const { lib, db } = load({ forms: [grantForm(103)], links: [narrativeLink] })
    await lib.planReports(103)
    const [q1, q2, q3] = rowsOf(db, 103)
    Object.assign(q1, { status: "CREATED", reportFormId: 5000 })
    Object.assign(q2, { status: "SKIPPED" })
    Object.assign(q3, { edited: true, dueOn: d("2027-02-01") })
    // Left behind when a report was detached from the category
    db.planned.push({ id: 900, parentFormId: 103, reportRuleId: null, reportCategoryId: 6, period: 0, label: "",
      periodStart: d("2026-04-01"), periodEnd: d("2027-03-31"), opensOn: null, status: "PLANNED", edited: false })
    db.forms[0].fundingEnd = d("2027-09-30") // the grant is extended by six months

    same(await lib.recalculateReports(103), { removed: 1, added: 3 }, "Untouched Q4 is replaced; Q4–Q6 are added")
    same(rowsOf(db, 103).map((r) => [r.period, r.label, r.status, r.edited]), [
      [0, "", "PLANNED", false],
      [1, "Q1 2026", "CREATED", false],
      [2, "Q2 2026", "SKIPPED", false],
      [3, "Q3 2026", "PLANNED", true],
      [4, "Q4 2027", "PLANNED", false],
      [5, "Q1 2027", "PLANNED", false],
      [6, "Q2 2027", "PLANNED", false],
    ])
  }

  // Changing frequency then recalculating: new periods that overlap kept ones are left out
  {
    const { lib, db } = load({ forms: [grantForm(104, { fundingStart: d("2026-01-01"), fundingEnd: d("2026-12-31") })], links: [narrativeLink] })
    await lib.planReports(104)
    const [q1, q2] = rowsOf(db, 104)
    Object.assign(q1, { status: "CREATED" })
    Object.assign(q2, { status: "CREATED" })
    db.categories.find((c) => c.id === 5)!.reportPeriodMonths = 6
    await lib.recalculateReports(104)
    same(rowsOf(db, 104).map((r) => [r.label, r.status]), [
      ["Q1 2026", "CREATED"],
      ["Q2 2026", "CREATED"],
      ["H2 2026", "PLANNED"],
    ], "H1 overlaps the created Q1/Q2; H2 is new")
  }

  // ─── Creating ──────────────────────────────────────────────────────────────

  // The job creates opened rows for approved parents, from the newest active template, once
  {
    const { lib, db } = load({ forms: [grantForm(110, { formStatusId: STATUS.Approved.id })], links: [narrativeLink] })
    await lib.planReports(110)
    const first = await lib.generateDueReports(d("2026-10-20"))
    same(first.errors, [])
    assert.equal(first.created, 2, "Q1 and Q2 have opened; catch-up creates both")
    const reports = db.forms.filter((f) => f.linkedFormId === 110)
    same(reports.map((r) => [r.title, r.formTemplateId, iso(r.fundingStart), iso(r.dueDate), r.primaryFormId]), [
      ["Narrative Report 2026 – Q1 2026", 51, "2026-04-01", "2026-07-15", 110],
      ["Narrative Report 2026 – Q2 2026", 51, "2026-07-01", "2026-10-15", 110],
    ])
    same(rowsOf(db, 110).map((r) => r.status), ["CREATED", "CREATED", "PLANNED", "PLANNED"])
    assert.equal(rowsOf(db, 110)[0].reportFormId, reports[0].id)
    assert.equal((await lib.generateDueReports(d("2026-10-20"))).created, 0, "Running twice creates nothing new")
  }

  // Parents that haven't reached the trigger get nothing; skipped rows are never created
  {
    const { lib, db } = load({
      forms: [grantForm(111, { formStatusId: STATUS.UnderReview.id }), grantForm(112, { formStatusId: STATUS.Approved.id })],
      links: [narrativeLink],
    })
    await lib.planReports(111)
    await lib.planReports(112)
    rowsOf(db, 112)[0].status = "SKIPPED"
    await lib.generateDueReports(d("2026-10-20"))
    same(db.forms.filter((f) => f.linkedFormId).map((f) => [f.linkedFormId, f.title]), [[112, "Narrative Report 2026 – Q2 2026"]])
  }

  // Create now ignores the opening date and uses edited dates; a missing template releases the row
  {
    const { lib, db } = load({ forms: [grantForm(113)], links: [narrativeLink] })
    await lib.planReports(113)
    const q4 = rowsOf(db, 113)[3]
    Object.assign(q4, { dueOn: d("2027-05-01"), edited: true })
    const created = await lib.createReport(q4.id, d("2026-05-01"))
    assert.ok(created.ok)
    const report = db.forms.find((f) => f.linkedFormId === 113)!
    same([report.title, report.formTemplateId, iso(report.dueDate)], ["Narrative Report 2026 – Q4 2027", 51, "2027-05-01"])
    same(await lib.createReport(q4.id, d("2026-05-01")), { ok: false, error: "Already created or skipped" })

    const empty = load({ forms: [grantForm(114)], links: [narrativeLink], templates: [{ id: 10, formCategoryId: 1, name: "Grant", active: true, createdAt: d("2026-01-01") }] })
    await empty.lib.planReports(114)
    const row = rowsOf(empty.db, 114)[0]
    same(await empty.lib.createReport(row.id, d("2026-07-01")), { ok: false, error: "No active Narrative Report template" })
    assert.equal(row.status, "PLANNED", "The row is released so a later run can try again")
  }

  // ─── Status changes ────────────────────────────────────────────────────────

  // After-status reports: created on approval (due N days later), rejected/paused with the parent, reopened on re-approval
  {
    const parent = grantForm(120)
    const { lib, db } = load({ forms: [parent], links: [dftLink] })
    await lib.planReports(120)
    parent.formStatusId = STATUS.Approved.id
    const result = await lib.applyStatusReports(120, d("2026-10-02"))
    same(result.created.map((r) => r.title), ["DFT Report"])
    const report = db.forms.find((f) => f.linkedFormId === 120)!
    same([iso(report.dueDate), iso(report.fundingStart)], ["2026-11-01", "2026-04-01"])

    parent.formStatusId = STATUS.Rejected.id
    await lib.applyStatusReports(120, d("2026-10-04"))
    assert.equal(report.formStatusId, STATUS.Rejected.id)
    parent.formStatusId = STATUS.Approved.id
    await lib.applyStatusReports(120, d("2026-10-05"))
    assert.equal(report.formStatusId, STATUS.Draft.id, "Re-approving reopens it")
    parent.formStatusId = STATUS.UnderReview.id
    await lib.applyStatusReports(120, d("2026-10-06"))
    assert.equal(report.formStatusId, STATUS.Paused.id, "Going back pauses it")
    report.formStatusId = STATUS.Approved.id
    parent.formStatusId = STATUS.Rejected.id
    await lib.applyStatusReports(120, d("2026-10-07"))
    assert.equal(report.formStatusId, STATUS.Approved.id, "An approved report is never parked")
    assert.equal(db.forms.filter((f) => f.linkedFormId === 120).length, 1, "Never a second report")
  }

  // A template set to start on submission gets its report when submitted; the default waits for approval
  {
    const early = load({
      forms: [grantForm(121, { formTemplateId: 11, formStatusId: STATUS.UnderReview.id })],
      links: [{ ...dftLink, overrides: [{ formTemplateId: 11, triggerStatusId: STATUS.UnderReview.id }] }],
    })
    await early.lib.planReports(121)
    await early.lib.applyStatusReports(121, d("2026-10-02"))
    assert.equal(early.db.forms.filter((f) => f.linkedFormId === 121).length, 1)

    const standard = load({ forms: [grantForm(122, { formStatusId: STATUS.UnderReview.id })], links: [dftLink] })
    await standard.lib.planReports(122)
    await standard.lib.applyStatusReports(122, d("2026-10-02"))
    assert.equal(standard.db.forms.filter((f) => f.linkedFormId === 122).length, 0)
  }

  // Upcoming: planned rows opening in the window, soonest first
  {
    const { lib } = load({ forms: [grantForm(130)], links: [narrativeLink] })
    await lib.planReports(130)
    const upcoming = await lib.upcomingReports(d("2026-06-01"), 120)
    same(upcoming.map((u) => [u.parentId, u.reportName, u.label, u.opensOn.slice(0, 10), u.ldaName]), [
      [130, "Narrative Report", "Q1 2026", "2026-06-16", "LDA 7"],
      [130, "Narrative Report", "Q2 2026", "2026-09-16", "LDA 7"],
    ])
  }

  // ─── Validation ────────────────────────────────────────────────────────────
  {
    const { lib } = load({})
    assert.equal(await lib.reportTimingInputError({ reportKind: null }), undefined, "No timing yet is allowed")
    assert.equal(await lib.reportTimingInputError({ reportKind: "PERIODIC", reportPeriodMonths: 3, reportOpensDaysBefore: 14, reportDueDaysAfterPeriodEnd: -10 }), undefined)
    assert.match((await lib.reportTimingInputError({ reportKind: "PERIODIC", reportPeriodMonths: null }))!, /quarterly/)
    assert.match((await lib.reportTimingInputError({ reportKind: "PERIODIC", reportPeriodMonths: 4 }))!, /quarterly/, "Only quarterly, half-yearly or yearly")
    assert.ok(await lib.reportTimingInputError({ reportKind: "WEEKLY" }))
    assert.ok(await lib.reportTimingInputError({ reportKind: "AFTER_STATUS", reportDueDays: 1.5 }))
    assert.ok(await lib.reportTimingInputError({ reportKind: "AFTER_STATUS", reportTriggerStatusId: 404 }))

    assert.equal(await lib.reportLinkInputError({ parentCategoryId: 1, reportCategoryId: 5 }), undefined)
    assert.match((await lib.reportLinkInputError({ parentCategoryId: 5, reportCategoryId: 6 }))!, /primary or secondary/)
    assert.match((await lib.reportLinkInputError({ parentCategoryId: 1, reportCategoryId: 3 }))!, /report category/)

    assert.equal(await lib.reportOverrideInputError({ enabled: false, triggerStatusId: null }), undefined)
    assert.equal(await lib.reportOverrideInputError({ enabled: true, triggerStatusId: 8 }), undefined)
    assert.ok(await lib.reportOverrideInputError({ enabled: "yes", triggerStatusId: null }))
    assert.ok(await lib.reportOverrideInputError({ enabled: true, triggerStatusId: 404 }))

    const current = { periodStart: d("2026-04-01"), periodEnd: d("2026-06-30") }
    same(lib.parsePlannedReportEdit({ dueOn: "2026-07-30", opensOn: null }, current), { edit: { opensOn: null, dueOn: "2026-07-30T00:00:00.000Z" } })
    assert.ok("error" in lib.parsePlannedReportEdit({ periodEnd: "2026-03-01" }, current), "Must start before it ends")
    assert.ok("error" in lib.parsePlannedReportEdit({ dueOn: "not a date" }, current))
    assert.ok("error" in lib.parsePlannedReportEdit({ periodStart: null }, current))
  }

  console.log("report-rules: periods, timing, planning, recalculation, creation, triggers, upcoming and validation passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
