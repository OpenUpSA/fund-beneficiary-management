// Run with: node -r tsx/cjs scripts/tests/primary-form.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const source = ts.transpileModule(readFileSync("lib/primary-form.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

type Template = { isPrimary: boolean; formCategory: string | null; primaryCategory: string | null }
type FormRow = {
  id: number
  localDevelopmentAgencyId: number
  fundingStart: Date
  fundingEnd: Date
  primaryFormId: number | null
  linkedFormId: number | null
  title: string
  status: string
  template: Template
}

const TEMPLATES: Record<string, Template> = {
  grant: { isPrimary: true, formCategory: "grant_funding", primaryCategory: null },
  fris: { isPrimary: true, formCategory: "fris_application", primaryCategory: null },
  dft: { isPrimary: false, formCategory: "dft_application", primaryCategory: "grant_funding" },
  dftReport: { isPrimary: false, formCategory: "dft_report", primaryCategory: null },
  narrative: { isPrimary: false, formCategory: "narrative_report", primaryCategory: "grant_funding" },
  survey: { isPrimary: false, formCategory: null, primaryCategory: null },
}

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

// Minimal in-memory evaluation of the Prisma `where` shapes lib/primary-form.ts uses
function matches(row: FormRow, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "formTemplate") {
      return Object.entries(cond as Record<string, unknown>).every(([k, v]) => row.template[k as keyof Template] === v)
    }
    if (key === "formStatus") {
      const label = (cond as { label: { notIn: string[] } }).label
      return !label.notIn.includes(row.status)
    }
    const value = row[key as keyof FormRow] as unknown
    if (cond === null || typeof cond !== "object" || cond instanceof Date) return value === cond
    const ops = cond as { lte?: Date; gte?: Date; not?: unknown; in?: unknown[] }
    if (ops.lte && !((value as Date) <= ops.lte)) return false
    if (ops.gte && !((value as Date) >= ops.gte)) return false
    if ("not" in ops && value === ops.not) return false
    if (ops.in && !ops.in.includes(value)) return false
    return true
  })
}

function load(rows: Array<Partial<FormRow> & { id: number; template: Template }>) {
  const forms: FormRow[] = rows.map((r) => ({
    localDevelopmentAgencyId: 1,
    fundingStart: d("2026-01-01"),
    fundingEnd: d("2026-12-31"),
    primaryFormId: null,
    linkedFormId: null,
    title: `Form ${r.id}`,
    status: "Draft",
    ...r,
  }))
  const byId = (id: number) => forms.find((f) => f.id === id)
  const view = (f: FormRow) => ({
    ...f,
    formTemplate: f.template,
    linkedForm: f.linkedFormId ? { ...byId(f.linkedFormId)!, formTemplate: byId(f.linkedFormId)!.template } : null,
  })

  const prisma = {
    localDevelopmentAgencyForm: {
      findUnique: async ({ where }: { where: { id: number } }) => (byId(where.id) ? view(byId(where.id)!) : null),
      findFirst: async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: unknown }) => {
        const found = forms.filter((f) => matches(f, where))
        if (orderBy) found.sort((a, b) => b.fundingStart.getTime() - a.fundingStart.getTime())
        return found[0] ? view(found[0]) : null
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) => forms.filter((f) => matches(f, where)).map(view),
      update: async ({ where, data }: { where: { id: number }; data: Partial<FormRow> }) => Object.assign(byId(where.id)!, data),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<FormRow> }) => {
        const hit = forms.filter((f) => matches(f, where))
        hit.forEach((f) => Object.assign(f, data))
        return { count: hit.length }
      },
    },
  }
  const exports: Record<string, unknown> = {}
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.equal(name, "@/db", `Unexpected dependency: ${name}`)
      return { default: prisma }
    },
  })
  return { lib: exports as unknown as typeof import("../../lib/primary-form"), primaryOf: (id: number) => byId(id)!.primaryFormId }
}

async function main() {
  // A secondary form goes under the primary of its category whose period contains its start date
  {
    const { lib, primaryOf } = load([
      { id: 1, template: TEMPLATES.grant },
      { id: 2, template: TEMPLATES.grant, fundingStart: d("2027-01-01"), fundingEnd: d("2027-12-31") },
      { id: 3, template: TEMPLATES.fris },
      { id: 10, template: TEMPLATES.dft, fundingStart: d("2026-10-02") },
      { id: 11, template: TEMPLATES.dft, fundingStart: d("2027-03-01") },
      { id: 12, template: TEMPLATES.dft, fundingStart: d("2026-12-31") },
      { id: 13, template: TEMPLATES.survey },
      { id: 14, template: TEMPLATES.dft, localDevelopmentAgencyId: 2 },
    ])
    assert.equal(await lib.assignPrimaryForm(10), 1)
    assert.equal(await lib.assignPrimaryForm(11), 2, "Next year's form lands under next year's primary")
    assert.equal(await lib.assignPrimaryForm(12), 1, "The period end date is inclusive")
    assert.equal(await lib.assignPrimaryForm(13), null, "A template without a primary category stays ungrouped")
    assert.equal(await lib.assignPrimaryForm(14), null, "Another LDA's primary is never used")
    assert.equal(await lib.assignPrimaryForm(1), null, "A primary is never grouped under another primary")
    assert.equal(primaryOf(10), 1)
    assert.equal(primaryOf(11), 2)
  }

  // Linked forms follow their parent: under the parent if it is primary, else under the parent's primary
  {
    const { lib } = load([
      { id: 1, template: TEMPLATES.grant },
      { id: 10, template: TEMPLATES.dft, primaryFormId: 1 },
      { id: 20, template: TEMPLATES.dftReport, linkedFormId: 10 },
      { id: 21, template: TEMPLATES.narrative, linkedFormId: 1, fundingStart: d("2030-01-01") },
    ])
    assert.equal(await lib.assignPrimaryForm(20), 1)
    assert.equal(await lib.assignPrimaryForm(21), 1, "A report of the primary stays under it, whatever its dates")
  }

  // A rejected primary doesn't hold its period
  {
    const { lib } = load([
      { id: 1, template: TEMPLATES.grant, status: "Rejected" },
      { id: 10, template: TEMPLATES.dft },
    ])
    assert.equal(await lib.assignPrimaryForm(10), null)
    assert.equal(await lib.primaryOverlapError(1, "grant_funding", d("2026-01-01"), d("2026-12-31")), undefined)
  }

  // Creating a primary attaches the LDA's ungrouped forms in its period, and their linked forms
  {
    const { lib, primaryOf } = load([
      { id: 1, template: TEMPLATES.grant },
      { id: 10, template: TEMPLATES.dft, fundingStart: d("2026-05-01") },
      { id: 11, template: TEMPLATES.dft, fundingStart: d("2027-05-01") },
      { id: 12, template: TEMPLATES.survey },
      { id: 13, template: TEMPLATES.dft, localDevelopmentAgencyId: 2 },
      { id: 20, template: TEMPLATES.dftReport, linkedFormId: 10, fundingStart: d("2028-01-01") },
      { id: 21, template: TEMPLATES.narrative, linkedFormId: 1 },
    ])
    await lib.placeForm(1)
    assert.equal(primaryOf(10), 1)
    assert.equal(primaryOf(20), 1, "The DFT Report follows its DFT Application")
    assert.equal(primaryOf(21), 1, "Reports of the primary itself are grouped too")
    assert.equal(primaryOf(11), null, "Outside the period")
    assert.equal(primaryOf(12), null, "Not a secondary of this category")
    assert.equal(primaryOf(13), null, "Another LDA")
  }

  // Changing a primary's dates releases forms that no longer fit
  {
    const { lib, primaryOf } = load([
      { id: 1, template: TEMPLATES.grant, fundingStart: d("2026-01-01"), fundingEnd: d("2026-06-30") },
      { id: 10, template: TEMPLATES.dft, fundingStart: d("2026-10-01"), primaryFormId: 1 },
      { id: 20, template: TEMPLATES.dftReport, linkedFormId: 10, primaryFormId: 1 },
    ])
    await lib.placeForm(1)
    assert.equal(primaryOf(10), null)
    assert.equal(primaryOf(20), null, "Its linked report moves with it")
  }

  // Overlap: same LDA and category only; touching periods do overlap, adjacent ones don't
  {
    const { lib } = load([{ id: 1, template: TEMPLATES.grant }])
    assert.match((await lib.primaryOverlapError(1, "grant_funding", d("2026-06-01"), d("2027-05-31")))!, /Form 1/)
    assert.ok(await lib.primaryOverlapError(1, "grant_funding", d("2026-12-31"), d("2027-12-31")))
    assert.equal(await lib.primaryOverlapError(1, "grant_funding", d("2027-01-01"), d("2027-12-31")), undefined)
    assert.equal(await lib.primaryOverlapError(1, "fris_application", d("2026-01-01"), d("2026-12-31")), undefined)
    assert.equal(await lib.primaryOverlapError(2, "grant_funding", d("2026-01-01"), d("2026-12-31")), undefined)
    assert.equal(await lib.primaryOverlapError(1, "grant_funding", d("2026-01-01"), d("2026-12-31"), 1), undefined, "Editing itself")
  }

  // Template settings validation
  {
    const { lib } = load([])
    assert.equal(lib.primaryFormSettingsError({}), undefined)
    assert.equal(lib.primaryFormSettingsError({ isPrimary: true, formCategory: "grant_funding" }), undefined)
    assert.equal(lib.primaryFormSettingsError({ isPrimary: false, primaryCategory: "grant_funding" }), undefined)
    assert.ok(lib.primaryFormSettingsError({ isPrimary: true, formCategory: null }))
    assert.ok(lib.primaryFormSettingsError({ isPrimary: true, formCategory: "grant_funding", primaryCategory: "grant_funding" }))
    assert.ok(lib.primaryFormSettingsError({ isPrimary: "yes" }))
    assert.ok(lib.primaryFormSettingsError({ primaryCategory: 5 }))
  }

  console.log("primary-form: matching by category and period, linked forms, attaching, overlaps and settings validation passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
