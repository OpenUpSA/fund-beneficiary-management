// Run with: node -r tsx/cjs scripts/tests/lda-form-create.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import * as permissionsModule from "../../lib/permissions"

const source = ts.transpileModule(readFileSync("app/api/lda-form/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

type Role = "SUPER_USER" | "ADMIN" | "PROGRAMME_OFFICER" | "USER"

async function create(options: {
  role: Role
  ldaIds?: number[]
  createRoles?: Role[]
  approveRoles?: Role[]
  active?: boolean
  body?: Record<string, unknown>
}) {
  const created: Array<Record<string, unknown>> = []
  const template = {
    id: 5,
    name: "Field Visit Report",
    active: options.active ?? true,
    createRoles: options.createRoles ?? ["PROGRAMME_OFFICER", "ADMIN"],
    approveRoles: options.approveRoles ?? ["PROGRAMME_OFFICER", "ADMIN"],
  }
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    "next-auth": { getServerSession: async () => ({ user: { id: "1", role: options.role, ldaIds: options.ldaIds ?? [1] } }) },
    "@/lib/auth": { NEXT_AUTH_OPTIONS: {} },
    "@/lib/permissions": permissionsModule,
    "@/lib/form-events": { triggerFormEvent: async () => undefined },
    "@/db": { default: {
      formTemplate: { findUnique: async () => template },
      formStatus: { findFirst: async () => ({ id: 1, label: "Draft" }) },
      user: { findUnique: async () => ({ id: 1 }) },
      localDevelopmentAgencyForm: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data)
          return { id: 10, ...data }
        },
        findUnique: async () => null,
      },
    } },
  }
  const exports: Record<string, (req: unknown) => Promise<Response>> = {}
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    console: { error: () => undefined },
  })
  const body = { localDevelopmentAgencyId: 1, formTemplateId: 5, formData: {}, ...options.body }
  const response = await exports.POST(new Request("http://localhost/api/lda-form", { method: "POST", body: JSON.stringify(body) }))
  return { response, created }
}

async function main() {
  // createRoles decides who may create, for any template type
  for (const role of ["PROGRAMME_OFFICER", "ADMIN", "SUPER_USER"] as const) {
    const allowed = await create({ role })
    assert.equal(allowed.response.status, 200, `${role} can create`)
    assert.equal(allowed.created.length, 1)
  }
  const ldaUserDenied = await create({ role: "USER" })
  assert.equal(ldaUserDenied.response.status, 403, "LDA user is not in createRoles")
  assert.equal(ldaUserDenied.created.length, 0)

  const ldaUserAllowed = await create({ role: "USER", createRoles: ["USER"], approveRoles: ["PROGRAMME_OFFICER"] })
  assert.equal(ldaUserAllowed.response.status, 200, "LDA user can create once opted in")

  const emptyRoles = await create({ role: "ADMIN", createRoles: [] })
  assert.equal(emptyRoles.response.status, 403, "Empty createRoles leaves only super users")
  assert.equal((await create({ role: "SUPER_USER", createRoles: [] })).response.status, 200)

  // Still limited to LDAs the user can see, and to active templates
  const otherLda = await create({ role: "USER", createRoles: ["USER"], ldaIds: [2] })
  assert.equal(otherLda.response.status, 403, "LDA user cannot create for another LDA")
  assert.equal((await create({ role: "ADMIN", active: false })).response.status, 404, "Inactive template is refused")

  // Only whitelisted fields are stored; approver fields need approve rights
  const presets = {
    amount: 5000,
    dueDate: "2026-12-01T00:00:00.000Z",
    fundingStart: "2026-01-01T00:00:00.000Z",
    approved: "2026-01-01T00:00:00.000Z",
    submitted: "2026-01-01T00:00:00.000Z",
    linkedFormId: 99,
    formStatusId: 3,
  }
  const byLdaUser = await create({ role: "USER", createRoles: ["USER"], approveRoles: ["PROGRAMME_OFFICER"], body: presets })
  const ldaData = byLdaUser.created[0]
  for (const field of ["amount", "dueDate", "fundingStart", "approved", "submitted", "linkedFormId"]) {
    assert.equal(field in ldaData, false, `LDA user cannot preset ${field}`)
  }
  assert.equal(ldaData.formStatusId, 1, "New forms always start as Draft")

  const byApprover = await create({ role: "PROGRAMME_OFFICER", body: presets })
  const poData = byApprover.created[0]
  assert.equal(poData.amount, 5000)
  assert.equal(poData.dueDate, presets.dueDate)
  assert.equal(poData.fundingStart, presets.fundingStart)
  assert.equal("approved" in poData, false)
  assert.equal("linkedFormId" in poData, false)
  assert.equal(poData.formStatusId, 1)

  console.log("lda-form-create: createRoles, LDA access, inactive templates and field whitelisting passed")
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
