// Run with: node -r tsx/cjs scripts/tests/linked-form.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const source = ts.transpileModule(readFileSync("lib/linked-form.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

const STATUSES = [
  { id: 1, label: "Draft" },
  { id: 2, label: "UnderReview" },
  { id: 3, label: "Approved" },
  { id: 4, label: "Rejected" },
  { id: 5, label: "Paused" },
]

type Form = { id: number; formStatusId: number; [key: string]: unknown }

function load(options: {
  linkedFormTemplateId?: number | null
  linkedFormDueDays?: number | null
  existingStatus?: string
} = {}) {
  const parentDue = new Date("2026-01-31T00:00:00.000Z")
  const created: Array<Record<string, unknown>> = []
  const updated: Array<{ id: number; formStatusId: number }> = []
  const existing: Form | null = options.existingStatus
    ? { id: 50, formStatusId: STATUSES.find(s => s.label === options.existingStatus)!.id }
    : null
  const statusLabel = (id: number) => STATUSES.find(s => s.id === id)!.label

  const prisma = {
    localDevelopmentAgencyForm: {
      findUnique: async () => ({
        localDevelopmentAgencyId: 7,
        dueDate: parentDue,
        fundingStart: null,
        fundingEnd: null,
        formTemplate: {
          linkedFormTemplateId: options.linkedFormTemplateId === undefined ? 9 : options.linkedFormTemplateId,
          linkedFormDueDays: options.linkedFormDueDays ?? null,
          linkedFormTemplate: { name: "DFT Report" },
        },
      }),
      findFirst: async () => existing && { id: existing.id, formStatus: { label: statusLabel(existing.formStatusId) } },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data)
        return { id: 99, ...data }
      },
      update: async ({ where, data }: { where: { id: number }; data: { formStatusId: number } }) => {
        updated.push({ id: where.id, formStatusId: data.formStatusId })
      },
    },
    formStatus: {
      findFirst: async ({ where }: { where: { label: string } }) => STATUSES.find(s => s.label === where.label) ?? null,
      findUnique: async ({ where }: { where: { id: number } }) => STATUSES.find(s => s.id === where.id) ?? null,
    },
  }
  const exports: Record<string, (...args: never[]) => unknown> = {}
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.equal(name, "@/db", `Unexpected dependency: ${name}`)
      return { default: prisma }
    },
  })
  return { lib: exports as unknown as typeof import("../../lib/linked-form"), created, updated, parentDue }
}

async function main() {
  const { lib } = load()
  const linked = { linkedFormTemplateId: 9, linkedFormTriggerStatusId: null }

  // Trigger decision: template's status, Approved by default, never without a linked template
  assert.equal(lib.isLinkedFormTrigger(linked, { id: 3, label: "Approved" }), true)
  assert.equal(lib.isLinkedFormTrigger(linked, { id: 2, label: "UnderReview" }), false)
  assert.equal(lib.isLinkedFormTrigger({ ...linked, linkedFormTriggerStatusId: 2 }, { id: 2, label: "UnderReview" }), true)
  assert.equal(lib.isLinkedFormTrigger({ ...linked, linkedFormTriggerStatusId: 2 }, { id: 3, label: "Approved" }), true)
  assert.equal(lib.isLinkedFormTrigger({ ...linked, linkedFormTriggerStatusId: 2 }, { id: 4, label: "Rejected" }), false)
  assert.equal(lib.isLinkedFormTrigger({ linkedFormTemplateId: null, linkedFormTriggerStatusId: 2 }, { id: 2, label: "UnderReview" }), false)

  // Created as Draft, due N days from today (UTC) when configured
  const withDays = load({ linkedFormDueDays: 14 })
  const createdForm = await withDays.lib.ensureLinkedForm(1)
  assert.ok(createdForm)
  assert.equal(withDays.created.length, 1)
  const data = withDays.created[0]
  assert.equal(data.formStatusId, 1)
  assert.equal(data.formTemplateId, 9)
  assert.equal(data.linkedFormId, 1)
  assert.equal(data.localDevelopmentAgencyId, 7)
  assert.match(String(data.title), /^DFT Report - \d{4}$/)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  assert.equal((data.dueDate as Date).toISOString(), new Date(today.getTime() + 14 * 86400000).toISOString())

  // Without days, the parent's due date is copied
  const noDays = load()
  await noDays.lib.ensureLinkedForm(1)
  assert.equal((noDays.created[0].dueDate as Date).toISOString(), noDays.parentDue.toISOString())

  // Existing linked form: reopen Paused/Rejected, leave anything else alone, never duplicate
  for (const status of ["Paused", "Rejected"]) {
    const parked = load({ existingStatus: status })
    assert.equal(await parked.lib.ensureLinkedForm(1), null)
    assert.equal(parked.created.length, 0)
    assert.deepEqual(parked.updated, [{ id: 50, formStatusId: 1 }], `${status} report is reopened as Draft`)
  }
  for (const status of ["Draft", "UnderReview", "Approved"]) {
    const active = load({ existingStatus: status })
    assert.equal(await active.lib.ensureLinkedForm(1), null)
    assert.equal(active.created.length, 0)
    assert.deepEqual(active.updated, [], `${status} report is left alone`)
  }

  // No linked template: nothing happens
  const unlinked = load({ linkedFormTemplateId: null })
  assert.equal(await unlinked.lib.ensureLinkedForm(1), null)
  assert.equal(unlinked.created.length, 0)

  // Status moves only touch an existing linked form
  const rejecting = load({ existingStatus: "Draft" })
  await rejecting.lib.setLinkedFormStatus(1, "Rejected")
  assert.deepEqual(rejecting.updated, [{ id: 50, formStatusId: 4 }])
  const nothingToMove = load()
  await nothingToMove.lib.setLinkedFormStatus(1, "Paused")
  assert.deepEqual(nothingToMove.updated, [])

  // Template settings validation
  assert.equal(await lib.linkedFormSettingsError({}), undefined)
  assert.equal(await lib.linkedFormSettingsError({ linkedFormTriggerStatusId: null, linkedFormDueDays: null }), undefined)
  assert.equal(await lib.linkedFormSettingsError({ linkedFormTriggerStatusId: 2, linkedFormDueDays: 0 }), undefined)
  assert.equal(await lib.linkedFormSettingsError({ linkedFormDueDays: 365 }), undefined)
  assert.ok(await lib.linkedFormSettingsError({ linkedFormDueDays: 366 }))
  assert.ok(await lib.linkedFormSettingsError({ linkedFormDueDays: -1 }))
  assert.ok(await lib.linkedFormSettingsError({ linkedFormDueDays: 1.5 }))
  assert.ok(await lib.linkedFormSettingsError({ linkedFormDueDays: "14" }))
  assert.ok(await lib.linkedFormSettingsError({ linkedFormTriggerStatusId: 404 }))
  assert.ok(await lib.linkedFormSettingsError({ linkedFormTriggerStatusId: "2" }))

  console.log("linked-form: trigger decision, creation, due dates, reopening, status moves and settings validation passed")
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
