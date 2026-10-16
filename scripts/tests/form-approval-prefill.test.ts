// Run with: node -r tsx/cjs scripts/tests/form-approval-prefill.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const template = JSON.parse(readFileSync("form-templates/dft-report.json", "utf8"))
const applicationData: Record<string, unknown> = {
  activity_name: "Community workshop",
  activity_date: "2026-10-15",
  activity_type: "workshop",
  training_type: ["climate_change_workshop"],
  focus_areas: ["climate_change"],
  expected_participants: 20,
  why_activity_needed: "Community training",
  who_will_facilitate: "Local facilitator",
  activity_venue: "Community hall",
}
const reportData: Record<string, unknown> = {
  did_not_take_attendance: "true",
  attendance_not_taken: "Attendance register unavailable",
  activity_impact: "Participants learned new skills",
  activity_learnings: "Allow more time for questions",
  major_deviations: "no",
  total_cost: "100",
  po_monitoring_indicators: "Reviewed",
}

const sources = new Map<string, string>()
function loadModule(path: string, dependencies: Record<string, unknown>): Record<string, unknown> {
  if (!sources.has(path)) {
    sources.set(path, ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)
  }
  const exports = {}
  runInNewContext(sources.get(path)!, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    console: { error: () => undefined, log: () => undefined },
  })
  return exports
}

async function request(options: {
  submit?: boolean
  saved?: Record<string, unknown>
  linked?: Record<string, unknown> | null
  canApprove?: boolean
  canView?: boolean
  failSave?: boolean
  status?: string
} = {}) {
  const saved = options.saved ?? reportData
  const record = {
    id: 1,
    localDevelopmentAgencyId: 1,
    formTemplateId: 1,
    formData: { ...saved },
    formTemplate: { form: template, approveRoles: [], fillRoles: [], linkedFormTemplateId: null },
    linkedForm: options.linked === null ? null : { formData: options.linked ?? applicationData },
    localDevelopmentAgency: { staffMembers: [] },
  }
  type UpdateData = {
    formStatusId?: number
    approved?: Date | null
    submitted?: Date | null
    formData?: Record<string, unknown>
  }
  const updates: UpdateData[] = []
  const sequence: string[] = []
  let prefillReads = 0
  const db = { default: {
    localDevelopmentAgencyForm: {
      findUnique: async (args: { include?: unknown }) => {
        if (args.include) prefillReads++
        return record
      },
      update: async ({ data }: { data: UpdateData }) => {
        if (options.failSave) throw new Error("Database unavailable")
        updates.push(data)
        Object.assign(record, data)
        sequence.push("saved")
        return record
      },
    },
    formStatus: { findFirst: async () => ({ id: options.submit ? 2 : 3 }) },
  } }
  const dependencies: Record<string, unknown> = {
    "@/db": db,
    "@prisma/client": { Prisma: {} },
    "@/lib/auth": { NEXT_AUTH_OPTIONS: {} },
    "next/server": { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    "next-auth": { getServerSession: async () => ({ user: { id: "1", role: "SUPER_USER" } }) },
    "next/cache": { revalidateTag: () => undefined },
    "@/lib/permissions": {
      permissions: { canViewLDA: () => options.canView !== false },
      canApproveForm: () => options.canApprove !== false,
      canFillForm: () => true,
    },
    "@/lib/form-events": {
      triggerFormEvent: async (_event: string, form: typeof record) => {
        assert.equal(updates.length, 1, "Approval event must follow the successful save")
        assert.ok(form.formData.activity_name, "Event must receive persisted prefills")
        sequence.push("event")
      },
    },
    "@/lib/template-placeholders": {},
  }
  dependencies["@/lib/lda-form-prefill"] = loadModule("lib/lda-form-prefill.ts", dependencies)
  dependencies["@/lib/number-input"] = loadModule("lib/number-input.ts", dependencies)
  dependencies["@/lib/form-validation/validate-submission"] = loadModule("lib/form-validation/validate-submission.ts", dependencies)
  const route = loadModule(options.submit
    ? "app/api/lda-form/[lda_form_id]/submit/route.ts"
    : "app/api/lda-form/[lda_form_id]/route.ts", dependencies)
  const handler = route[options.submit ? "PUT" : "PATCH"] as (
    req: { json: () => Promise<unknown> },
    context: { params: { lda_form_id: string } },
  ) => Promise<Response>
  const response = await handler({
    json: async () => ({ formStatusLabel: options.status ?? "Approved" }),
  }, { params: { lda_form_id: "1" } })
  // Let the asynchronous approval event finish before checking its effects.
  await new Promise(resolve => setImmediate(resolve))
  return { response, body: await response.json(), updates, sequence, prefillReads }
}

async function main() {
  const approved = await request()
  assert.equal(approved.response.status, 200)
  assert.deepEqual(approved.body.formData, { ...reportData, ...applicationData })
  assert.deepEqual(JSON.parse(JSON.stringify(approved.updates[0].formData)), approved.body.formData)
  assert.equal(approved.updates[0].formStatusId, 3)
  assert.ok(Number.isFinite(Date.parse(approved.updates[0].approved!.toISOString())))
  assert.deepEqual(approved.sequence, ["saved", "event"])

  const preserved = await request({ saved: { ...reportData, activity_name: "Saved name" } })
  assert.equal(preserved.response.status, 200)
  assert.equal(preserved.body.formData.activity_name, "Saved name")

  const alreadySaved = await request({ saved: { ...reportData, ...applicationData } })
  assert.equal(alreadySaved.response.status, 200)
  assert.equal(alreadySaved.updates[0].formData, undefined, "Do not rewrite answers without new prefills")

  const missingSource = await request({ linked: null })
  assert.equal(missingSource.response.status, 400)
  assert.deepEqual(missingSource.body.issues.map((issue: { fieldName: string }) => issue.fieldName), Object.keys(applicationData))
  assert.deepEqual(missingSource.sequence, [])

  const missingAnswer = await request({ saved: { ...reportData, activity_impact: "" } })
  assert.equal(missingAnswer.response.status, 400)
  assert.equal(missingAnswer.body.issues[0].fieldName, "activity_impact")
  assert.deepEqual(missingAnswer.sequence, [])

  const missingFeedback = await request({ saved: { ...reportData, po_monitoring_indicators: "" } })
  assert.equal(missingFeedback.response.status, 400)
  assert.match(missingFeedback.body.error, /admin feedback/)
  assert.deepEqual(missingFeedback.sequence, [])

  const invalidPrefill = await request({ linked: { ...applicationData, expected_participants: -1 } })
  assert.equal(invalidPrefill.response.status, 400)
  assert.equal(invalidPrefill.body.issues[0].message, "cannot be negative")
  assert.deepEqual(invalidPrefill.sequence, [])

  for (const options of [{ canApprove: false }, { canView: false }]) {
    const denied = await request(options)
    assert.equal(denied.response.status, 403)
    assert.equal(denied.prefillReads, 0)
    assert.deepEqual(denied.sequence, [])
  }

  const failed = await request({ failSave: true })
  assert.equal(failed.response.status, 500)
  assert.deepEqual(failed.sequence, [])

  const rejected = await request({ status: "Rejected" })
  assert.equal(rejected.response.status, 200)
  assert.equal(rejected.prefillReads, 0)
  assert.equal(rejected.updates[0].formData, undefined)
  assert.deepEqual(rejected.sequence, ["saved"])

  const submitted = await request({ submit: true })
  assert.equal(submitted.response.status, 200)
  assert.equal(submitted.updates[0].formStatusId, 2)
  assert.equal(submitted.updates[0].formData, undefined, "Submission should not persist prefills")
  assert.deepEqual(submitted.sequence, ["saved"])

  const incompleteSubmission = await request({ submit: true, linked: null })
  assert.equal(incompleteSubmission.response.status, 400)
  assert.deepEqual(incompleteSubmission.sequence, [])

  console.log("form-approval-prefill: approval persistence, submission, validation, permissions and event ordering checks passed")
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
