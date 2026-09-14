// Run with: yarn tsx scripts/tests/form-template-delete.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { runInNewContext } from "node:vm"
import { Prisma } from "@prisma/client"
import ts from "typescript"

// Exercise the route with isolated session, database and cache dependencies.
const route = ts.transpileModule(
  readFileSync(resolve("app/api/form-template/[form_template_id]/route.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText

async function request(options: {
  role?: string | null
  id?: string
  usageCount?: number
  missing?: boolean
  deleteError?: string
} = {}) {
  const tags: string[] = []
  let lookups = 0
  let deletions = 0
  const role = options.role === undefined ? "SUPER_USER" : options.role
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    "next-auth": { getServerSession: async () => role ? { user: { role } } : null },
    "@/lib/auth": { NEXT_AUTH_OPTIONS: {} },
    "@/lib/permissions": { permissions: { isSuperUser: (user: { role: string }) => user.role === "SUPER_USER" } },
    "next/cache": { revalidateTag: (tag: string) => tags.push(tag) },
    "@prisma/client": { Prisma },
    "@/db": { default: { formTemplate: {
      findUnique: async () => {
        lookups++
        return options.missing ? null : { _count: { localDevelopmentAgencyForms: options.usageCount ?? 0 } }
      },
      delete: async () => {
        deletions++
        if (options.deleteError) {
          throw new Prisma.PrismaClientKnownRequestError("Deletion failed", {
            code: options.deleteError,
            clientVersion: Prisma.prismaVersion.client,
          })
        }
        return { id: 1, name: "Unused template" }
      },
    } } },
  }
  const exports: { DELETE?: (req: unknown, context: unknown) => Promise<Response> } = {}
  runInNewContext(route, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    console: { error: () => undefined },
  })
  const response = await exports.DELETE!({}, { params: { form_template_id: options.id ?? "1" } })
  return { status: response.status, body: await response.json(), tags, lookups, deletions }
}

async function main() {
  for (const role of [null, "USER", "ADMIN", "PROGRAMME_OFFICER"]) {
    const result = await request({ role })
    assert.equal(result.status, role === null ? 401 : 403)
    assert.equal(result.lookups, 0)
    assert.equal(result.deletions, 0)
    assert.deepEqual(result.tags, [])
  }

  for (const id of ["invalid", "0", "-1", "1.5", "9007199254740992"]) {
    const result = await request({ id })
    assert.equal(result.status, 400)
    assert.equal(result.lookups, 0)
  }

  const missing = await request({ missing: true })
  assert.equal(missing.status, 404)
  assert.equal(missing.deletions, 0)

  for (const usageCount of [1, 12]) {
    const used = await request({ usageCount })
    assert.equal(used.status, 409)
    assert.equal(used.body.usageCount, usageCount)
    assert.match(used.body.error, /cannot be deleted/)
    assert.equal(used.deletions, 0, "Templates with forms must not be deleted")
    assert.deepEqual(used.tags, [])
  }

  const unused = await request()
  assert.equal(unused.status, 200)
  assert.equal(unused.deletions, 1)
  assert.deepEqual(unused.tags, ["form-templates:list", "lda-forms:list"])

  for (const [deleteError, status] of [["P2003", 409], ["P2025", 404], ["P2024", 500]] as const) {
    const result = await request({ deleteError })
    assert.equal(result.status, status)
    assert.ok(result.body.error)
    assert.deepEqual(result.tags, [], "Failed deletion must not invalidate caches or report success")
  }
  console.log("form-template-delete: all assertions passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
