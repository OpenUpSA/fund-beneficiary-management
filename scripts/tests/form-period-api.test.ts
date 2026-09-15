// Run with: node -r tsx/cjs scripts/tests/form-period-api.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const source = ts.transpileModule(
  readFileSync("app/api/lda-form/[lda_form_id]/route.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText

async function request(canApprove = true, failSave = false) {
  const tags: string[] = []
  const updates: Array<Record<string, Date>> = []
  const body = { fundingStart: "2027-01-01T00:00:00.000Z", fundingEnd: "2027-12-31T00:00:00.000Z" }
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    "next-auth": { getServerSession: async () => ({ user: { id: "1", role: "SUPER_USER" } }) },
    "next/cache": { revalidateTag: (tag: string) => tags.push(tag) },
    "@prisma/client": { Prisma: {} },
    "@/lib/auth": { NEXT_AUTH_OPTIONS: {} },
    "@/lib/permissions": {
      permissions: { canViewLDA: () => true, isLDAUser: () => false },
      canApproveForm: () => canApprove,
      canFillForm: () => true,
    },
    "@/lib/form-events": {},
    "@/lib/form-validation/validate-submission": {},
    "@/lib/lda-form-prefill": {},
    "@/lib/template-placeholders": {},
    "@/db": { default: { localDevelopmentAgencyForm: {
      findUnique: async () => ({ localDevelopmentAgencyId: 1, formTemplate: { approveRoles: [] } }),
      update: async ({ data }: { data: Record<string, Date> }) => {
        updates.push(data)
        if (failSave) throw new Error("Database unavailable")
        return { id: 1, ...data, formTemplate: { linkedFormTemplateId: null } }
      },
    } } },
  }
  const exports: Record<string, (req: unknown, context: unknown) => Promise<Response>> = {}
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    console: { error: () => undefined },
  })
  const response = await exports.PATCH({ json: async () => body }, { params: { lda_form_id: "1" } })
  return { response, updates, tags, body }
}

async function main() {
  const saved = await request()
  assert.equal(saved.response.status, 200)
  assert.equal(saved.updates.length, 1)
  assert.equal(saved.updates[0].fundingStart.toISOString(), saved.body.fundingStart)
  assert.equal(saved.updates[0].fundingEnd.toISOString(), saved.body.fundingEnd)
  assert.deepEqual(saved.tags, ["lda-forms:list"])

  const denied = await request(false)
  assert.equal(denied.response.status, 403)
  assert.equal(denied.updates.length, 0)
  assert.deepEqual(denied.tags, [])

  const failed = await request(true, true)
  assert.equal(failed.response.status, 500)
  assert.deepEqual(failed.tags, [])
  console.log("form-period-api: PATCH date persistence, permissions and cache checks passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
