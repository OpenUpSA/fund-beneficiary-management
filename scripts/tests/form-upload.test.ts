// Run with: node -r tsx/cjs scripts/tests/form-upload.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import * as formUpload from "../../lib/form-upload"

const { FORM_UPLOAD_MAX_BYTES, formUploadAccept, formUploadFileError, hasFormUploadSignature } = formUpload

const source = ts.transpileModule(
  readFileSync("app/api/document/route.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText

async function post(file?: File) {
  const uploads: Array<Record<string, unknown>> = []
  const creates: Array<Record<string, unknown>> = []
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    "next-auth": { getServerSession: async () => ({ user: { id: "1", role: "ADMIN" } }) },
    "next/cache": { revalidateTag: () => undefined },
    "@prisma/client": { DocumentType: {}, DocumentUploadType: {} },
    "@/lib/auth": { NEXT_AUTH_OPTIONS: {} },
    "@/lib/permissions": { permissions: {
      isLDAUser: () => false,
      isSuperUser: () => false,
      isAdmin: () => true,
      isProgrammeOfficer: () => false,
    } },
    "@/lib/form-upload": formUpload,
    "@/lib/imagekit": { default: () => ({
      upload: async (input: Record<string, unknown>) => {
        uploads.push(input)
        return { filePath: "/uploaded" }
      },
    }) },
    "@/db": { default: { document: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        creates.push(data)
        return { id: 1, ...data }
      },
    } } },
  }
  const exports: Record<string, (req: unknown) => Promise<Response>> = {}
  runInNewContext(source, {
    exports,
    Buffer,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    console: { error: () => undefined },
  })
  const body = new FormData()
  body.set("title", "Upload")
  body.set("ldaId", "1")
  if (file) body.set("file", file)
  const response = await exports.POST(new Request("http://localhost/api/document", { method: "POST", body }))
  return { response, uploads, creates }
}

const pdf = Buffer.from("%PDF-1.7\n")
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0])
const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const heic = Buffer.from("\0\0\0\x18ftypheic")
const exe = Buffer.from("MZ\x90\0")

async function main() {
  // Size limits: 1 byte minimum, FORM_UPLOAD_MAX_BYTES maximum (inclusive)
  assert.ok(formUploadFileError({ name: "a.pdf", type: "application/pdf", size: 0 }))
  assert.equal(formUploadFileError({ name: "a.pdf", type: "application/pdf", size: 1 }), undefined)
  assert.equal(formUploadFileError({ name: "a.pdf", type: "application/pdf", size: FORM_UPLOAD_MAX_BYTES }), undefined)
  assert.ok(formUploadFileError({ name: "a.pdf", type: "application/pdf", size: FORM_UPLOAD_MAX_BYTES + 1 }))

  // Everyday formats pass, including files the browser could not type
  for (const [name, type] of [
    ["a.pdf", "application/pdf"],
    ["a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["a.xls", "application/vnd.ms-excel"],
    ["a.csv", "application/vnd.ms-excel"],
    ["a.csv", "text/csv"],
    ["a.JPG", "image/jpeg"],
    ["photo.heic", ""],
    ["a.pptx", "application/octet-stream"],
  ]) {
    assert.equal(formUploadFileError({ name, type, size: 10 }), undefined, `${name} (${type || "no type"}) should pass`)
  }

  // Active content, archives and executables are refused, even when renamed
  for (const [name, type] of [
    ["a.svg", "image/svg+xml"],
    ["a.html", "text/html"],
    ["a.js", "text/javascript"],
    ["a.zip", "application/zip"],
    ["a.exe", "application/x-msdownload"],
    ["noextension", ""],
    ["a.pdf", "text/html"],
    ["a.pdf.exe", "application/pdf"],
  ]) {
    assert.ok(formUploadFileError({ name, type, size: 10 }), `${name} (${type}) should be refused`)
  }

  // A template's accepted_file_types can narrow the allowlist but never widen it
  assert.ok(formUploadFileError({ name: "a.pdf", type: "application/pdf", size: 10 }, ["image/png"]))
  assert.equal(formUploadFileError({ name: "a.png", type: "image/png", size: 10 }, ["image/png"]), undefined)
  assert.ok(formUploadFileError({ name: "a.zip", type: "application/zip", size: 10 }, ["application/zip"]))
  assert.equal(formUploadAccept(["image/png"]), ".png,image/png")
  assert.ok(formUploadAccept().split(",").includes(".heic"))
  assert.ok(!formUploadAccept().includes("svg"))

  // Contents must match the extension
  assert.equal(hasFormUploadSignature(pdf, "a.pdf"), true)
  assert.equal(hasFormUploadSignature(zip, "a.xlsx"), true)
  assert.equal(hasFormUploadSignature(ole, "a.doc"), true)
  assert.equal(hasFormUploadSignature(png, "a.png"), true)
  assert.equal(hasFormUploadSignature(heic, "a.heic"), true)
  assert.equal(hasFormUploadSignature(Buffer.from("a,b\n1,2\n"), "a.csv"), true)
  assert.equal(hasFormUploadSignature(exe, "a.pdf"), false)
  assert.equal(hasFormUploadSignature(exe, "a.csv"), false)
  assert.equal(hasFormUploadSignature(pdf, "a.docx"), false)

  // The document API enforces the same rules before anything reaches ImageKit
  const saved = await post(new File([pdf], "report.pdf", { type: "application/pdf" }))
  assert.equal(saved.response.status, 200)
  assert.equal(saved.uploads.length, 1)
  assert.equal(saved.creates.length, 1)

  for (const [label, file] of [
    ["missing file", undefined],
    ["empty file", new File([], "empty.pdf", { type: "application/pdf" })],
    ["too large", new File([Buffer.concat([pdf, Buffer.alloc(FORM_UPLOAD_MAX_BYTES)])], "big.pdf", { type: "application/pdf" })],
    ["disallowed type", new File(["<svg/>"], "a.svg", { type: "image/svg+xml" })],
    ["renamed executable", new File([exe], "invoice.pdf", { type: "application/pdf" })],
  ] as const) {
    const refused = await post(file)
    assert.equal(refused.response.status, 400, `${label} should be refused`)
    assert.equal(refused.uploads.length, 0, `${label} must not reach ImageKit`)
    assert.equal(refused.creates.length, 0, `${label} must not be saved`)
  }

  console.log("form-upload tests passed")
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
