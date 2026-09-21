// Run with: node -r tsx/cjs scripts/tests/lda-logo-api.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { hasLogoSignature, LDA_LOGO_MAX_BYTES, logoFileError } from "../../lib/lda-logo"

const source = ts.transpileModule(
  readFileSync("app/api/lda/[lda_id]/route.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6AAAAAElFTkSuQmCC", "base64")
const file = (contents: BlobPart = png, type = "image/png") => new File([contents], "logo.png", { type })

function multipart(logo?: File | string, remove = false, data = '{"name":"Updated LDA"}') {
  const body = new FormData()
  body.set("data", data)
  if (logo !== undefined) body.set("logo", logo)
  if (remove) body.set("removeLogo", "true")
  return body
}

async function update(body: FormData | string, options: {
  allowed?: boolean
  exists?: boolean
  failUpload?: boolean
  failSave?: boolean
  failCleanup?: boolean
  oldLogo?: string | null
} = {}) {
  const tags: string[] = []
  const uploads: Array<Record<string, unknown>> = []
  const deletes: string[] = []
  const updates: Array<Record<string, unknown>> = []
  const record = { id: 1, name: "Original LDA", logo: options.oldLogo ?? null }
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    "next-auth": { getServerSession: async () => ({ user: { id: "1" } }) },
    "next/cache": { revalidateTag: (tag: string) => tags.push(tag) },
    "@prisma/client": { Prisma: {} },
    "@/lib/auth": { NEXT_AUTH_OPTIONS: {} },
    "@/lib/permissions": { permissions: { canManageLDA: () => options.allowed !== false } },
    "@/lib/lda-logo": { hasLogoSignature, logoFileError },
    "@/lib/imagekit": { default: () => ({
      upload: async (input: Record<string, unknown>) => {
        uploads.push(input)
        if (options.failUpload) throw new Error("Upload unavailable")
        return { fileId: "new-file", filePath: "/lda-logos/new-file.png" }
      },
      deleteFile: async (id: string) => {
        deletes.push(id)
        if (options.failCleanup) throw new Error("Cleanup unavailable")
      },
    }) },
    "@/db": { default: { localDevelopmentAgency: {
      findUnique: async () => options.exists === false ? null : record,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data)
        if (options.failSave) throw new Error("Database unavailable")
        Object.assign(record, data)
        return record
      },
    } } },
  }
  const exports: Record<string, (req: unknown, context: unknown) => Promise<Response>> = {}
  runInNewContext(source, {
    exports,
    Buffer,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    console: { error: () => undefined },
  })
  const req = new Request("http://localhost/api/lda/1", {
    method: "PUT",
    headers: typeof body === "string" ? { "Content-Type": "application/json" } : undefined,
    body,
  })
  const response = await exports.PUT(req, { params: { lda_id: "1" } })
  return { response, tags, uploads, deletes, updates, record }
}

async function main() {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) {
    assert.equal(logoFileError({ type, size: LDA_LOGO_MAX_BYTES }), undefined)
  }
  assert.ok(logoFileError({ type: "image/png", size: LDA_LOGO_MAX_BYTES + 1 }))
  assert.ok(logoFileError({ type: "image/png", size: 0 }))
  assert.ok(logoFileError({ type: "image/svg+xml", size: 100 }))
  assert.equal(hasLogoSignature(png, "image/png"), true)
  assert.equal(hasLogoSignature(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg"), true)
  assert.equal(hasLogoSignature(Buffer.from("RIFF0000WEBP"), "image/webp"), true)
  assert.equal(hasLogoSignature(png, "image/jpeg"), false)
  assert.equal(hasLogoSignature(new Uint8Array(), "image/png"), false)

  // An optional logo does not change ordinary saves, including older JSON clients.
  for (const oldLogo of [null, "/lda-logos/existing.png"]) {
    const unchanged = await update('{"name":"Updated LDA","logo":"untrusted-url"}', { oldLogo })
    assert.equal(unchanged.response.status, 200)
    assert.equal(unchanged.record.logo, oldLogo)
    assert.equal(unchanged.uploads.length, 0)
    assert.equal("logo" in unchanged.updates[0], false)
  }

  // Upload and replacement persist alongside the other edits.
  for (const oldLogo of [null, "/lda-logos/existing.png"]) {
    const saved = await update(multipart(file()), { oldLogo })
    assert.equal(saved.response.status, 200)
    assert.equal(saved.record.logo, "/lda-logos/new-file.png")
    assert.equal(saved.record.name, "Updated LDA")
    assert.equal(saved.uploads[0].folder, "/lda-logos")
    assert.equal(saved.uploads[0].file, png.toString("base64"))
    assert.deepEqual(saved.tags, ["lda:detail:1", "ldas:list"])
    assert.deepEqual(saved.deletes, [])
  }

  const removed = await update(multipart(undefined, true), { oldLogo: "/lda-logos/existing.png" })
  assert.equal(removed.response.status, 200)
  assert.equal(removed.record.logo, null)
  assert.equal(removed.uploads.length, 0)

  for (const body of [
    multipart(file("not an image")),
    multipart(file(png, "image/svg+xml")),
    multipart(file("")),
    multipart(file(new Uint8Array(LDA_LOGO_MAX_BYTES + 1))),
    multipart("not a file"),
    multipart(file(), true),
    multipart(file(), false, "not json"),
    multipart(file(), false, "null"),
    new FormData(),
    "[]",
  ]) {
    const invalid = await update(body)
    assert.equal(invalid.response.status, 400)
    assert.equal(invalid.uploads.length, 0)
    assert.equal(invalid.updates.length, 0)
  }

  const denied = await update(multipart(file()), { allowed: false })
  assert.equal(denied.response.status, 403)
  assert.equal(denied.uploads.length, 0)
  assert.equal(denied.updates.length, 0)

  const missing = await update(multipart(file()), { exists: false })
  assert.equal(missing.response.status, 404)
  assert.equal(missing.uploads.length, 0)

  const uploadFailed = await update(multipart(file()), { failUpload: true, oldLogo: "/existing.png" })
  assert.equal(uploadFailed.response.status, 500)
  assert.equal(uploadFailed.updates.length, 0)
  assert.equal(uploadFailed.record.logo, "/existing.png")
  assert.deepEqual(uploadFailed.tags, [])

  for (const failCleanup of [false, true]) {
    const saveFailed = await update(multipart(file()), { failSave: true, failCleanup, oldLogo: "/existing.png" })
    assert.equal(saveFailed.response.status, 500)
    assert.equal(saveFailed.record.logo, "/existing.png")
    assert.deepEqual(saveFailed.deletes, ["new-file"])
    assert.deepEqual(saveFailed.tags, [])
  }

  console.log("lda-logo-api: optional saves, upload, replacement, removal, validation, permissions and failure cleanup passed")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
