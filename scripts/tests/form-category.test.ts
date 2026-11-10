// Run with: node -r tsx/cjs scripts/tests/form-category.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const source = ts.transpileModule(readFileSync("lib/form-category.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

const CATEGORIES = [
  { id: 1, key: "grant_funding", role: "PRIMARY" },
  { id: 2, key: "dft_application", role: "SECONDARY" },
  { id: 3, key: "dft_report", role: "REPORT" },
]

const prisma = {
  formCategory: {
    findUnique: async ({ where }: { where: { id?: number; key?: string } }) =>
      CATEGORIES.find((c) => (where.id !== undefined ? c.id === where.id : c.key === where.key)) ?? null,
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
const lib = exports as unknown as typeof import("../../lib/form-category")

async function main() {
  // Creating
  const valid = { key: "fris_application", label: "FRIS Application", role: "PRIMARY" }
  assert.equal(await lib.formCategoryInputError(valid), undefined)
  assert.equal(await lib.formCategoryInputError({ ...valid, role: "SECONDARY", parentCategoryId: 1 }), undefined)
  assert.match((await lib.formCategoryInputError({ ...valid, key: "grant_funding" }))!, /already exists/)
  assert.ok(await lib.formCategoryInputError({ ...valid, key: "Bad Key" }))
  assert.ok(await lib.formCategoryInputError({ ...valid, key: "1st" }))
  assert.ok(await lib.formCategoryInputError({ ...valid, label: "  " }))
  assert.ok(await lib.formCategoryInputError({ ...valid, role: "OTHER" }))

  // Parents: only secondary categories, and only under a primary
  assert.match((await lib.formCategoryInputError({ ...valid, parentCategoryId: 1 }))!, /Only secondary/)
  assert.match((await lib.formCategoryInputError({ ...valid, role: "SECONDARY", parentCategoryId: 3 }))!, /primary category/)
  assert.ok(await lib.formCategoryInputError({ ...valid, role: "SECONDARY", parentCategoryId: 404 }))

  // Updating: partial payloads are checked against the stored category
  const dft = { id: 2, role: "SECONDARY", parentCategoryId: 1 }
  assert.equal(await lib.formCategoryInputError({ label: "DFT" }, dft), undefined)
  assert.equal(await lib.formCategoryInputError({ active: false }, dft), undefined)
  assert.match((await lib.formCategoryInputError({ key: "dft" }, dft))!, /can't be changed/)
  assert.match((await lib.formCategoryInputError({ role: "REPORT" }, dft))!, /Only secondary/, "Clear the parent when leaving secondary")
  assert.equal(await lib.formCategoryInputError({ role: "REPORT", parentCategoryId: null }, dft), undefined)
  assert.ok(await lib.formCategoryInputError({ parentCategoryId: 2 }, dft), "Not under itself")
  assert.ok(await lib.formCategoryInputError({ active: "yes" }, dft))

  // Template category ids
  assert.equal(await lib.formCategoryIdError(undefined), undefined)
  assert.equal(await lib.formCategoryIdError(null), undefined)
  assert.equal(await lib.formCategoryIdError(1), undefined)
  assert.ok(await lib.formCategoryIdError(404))
  assert.ok(await lib.formCategoryIdError("1"))

  // Keys are made from the label, unique, and always valid
  assert.equal(await lib.uniqueCategoryKey("Narrative Report"), "narrative_report")
  assert.equal(await lib.uniqueCategoryKey("Grant Funding"), "grant_funding_2", "Taken keys get a number")
  assert.equal(await lib.uniqueCategoryKey(" 2027 SOAR / Grant! "), "c_2027_soar_grant")
  assert.equal(await lib.formCategoryInputError({ key: await lib.uniqueCategoryKey("2027 Report"), label: "2027 Report", role: "REPORT" }), undefined)

  // A template's type follows its category
  assert.equal(lib.templateTypeForRole("REPORT"), "REPORT")
  assert.equal(lib.templateTypeForRole("SECONDARY"), "APPLICATION")
  assert.equal(await lib.templateTypeForCategory(3), "REPORT")
  assert.equal(await lib.templateTypeForCategory(1), "APPLICATION")
  assert.equal(await lib.templateTypeForCategory(null), undefined, "No category: the type is chosen by hand")

  console.log("form-category: keys, generated keys, labels, roles, parents, partial updates, template category ids and types passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
