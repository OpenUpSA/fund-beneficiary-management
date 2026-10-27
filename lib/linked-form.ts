import prisma from "@/db"

const DAY_MS = 24 * 60 * 60 * 1000

// Linked forms in these statuses were parked by an earlier status change on the
// parent and may be reopened; any other status means the LDA has moved on.
const REOPENABLE_STATUSES = ["Paused", "Rejected"]

interface LinkedFormSettings {
  linkedFormTemplateId: number | null
  linkedFormTriggerStatusId: number | null
}

/**
 * True when moving a form into `status` should create (or reopen) its linked
 * form: the template's trigger status, or Approved when none is set. Approved
 * always counts, since it comes after any trigger — this also covers forms that
 * passed the trigger before the setting existed.
 */
export function isLinkedFormTrigger(
  template: LinkedFormSettings | null | undefined,
  status: { id: number; label: string } | null | undefined,
): boolean {
  if (!template?.linkedFormTemplateId || !status) return false
  return status.label === "Approved" || status.id === template.linkedFormTriggerStatusId
}

/**
 * Create the linked form (e.g. the report for an application) as a Draft, or
 * reopen it if it was paused or rejected. Returns the newly created form, if any.
 */
export async function ensureLinkedForm(formId: number) {
  const parent = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: formId },
    select: {
      localDevelopmentAgencyId: true,
      fundingStart: true,
      fundingEnd: true,
      formTemplate: {
        select: {
          linkedFormTemplateId: true,
          linkedFormDueDays: true,
          linkedFormTemplate: { select: { name: true } },
        },
      },
    },
  })
  const template = parent?.formTemplate
  if (!parent || !template?.linkedFormTemplateId) return null

  const [existing, draftStatus] = await Promise.all([
    prisma.localDevelopmentAgencyForm.findFirst({
      where: { linkedFormId: formId },
      select: { id: true, formStatus: { select: { label: true } } },
    }),
    prisma.formStatus.findFirst({ where: { label: "Draft" } }),
  ])
  if (!draftStatus) return null

  if (existing) {
    if (REOPENABLE_STATUSES.includes(existing.formStatus.label)) {
      await prisma.localDevelopmentAgencyForm.update({
        where: { id: existing.id },
        data: { formStatusId: draftStatus.id },
      })
    }
    return null
  }

  // Due N days from today (UTC calendar day), or no due date when unset
  let dueDate: Date | null = null
  if (template.linkedFormDueDays != null) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    dueDate = new Date(today.getTime() + template.linkedFormDueDays * DAY_MS)
  }

  return prisma.localDevelopmentAgencyForm.create({
    data: {
      localDevelopmentAgencyId: parent.localDevelopmentAgencyId,
      formTemplateId: template.linkedFormTemplateId,
      formStatusId: draftStatus.id,
      formData: {},
      title: `${template.linkedFormTemplate?.name || "Linked Form"} - ${new Date().getFullYear()}`,
      linkedFormId: formId,
      dueDate,
      fundingStart: parent.fundingStart,
      fundingEnd: parent.fundingEnd,
    },
  })
}

export const LINKED_FORM_MAX_DUE_DAYS = 365

/** Validate the linked-form settings on a template create/update payload. */
export async function linkedFormSettingsError(data: {
  linkedFormTriggerStatusId?: unknown
  linkedFormDueDays?: unknown
}): Promise<string | undefined> {
  const days = data.linkedFormDueDays
  if (days != null && (!Number.isInteger(days) || (days as number) < 0 || (days as number) > LINKED_FORM_MAX_DUE_DAYS)) {
    return `Days to complete linked form must be a whole number from 0 to ${LINKED_FORM_MAX_DUE_DAYS}`
  }
  const statusId = data.linkedFormTriggerStatusId
  if (statusId != null) {
    const status = Number.isInteger(statusId)
      ? await prisma.formStatus.findUnique({ where: { id: statusId as number }, select: { id: true } })
      : null
    if (!status) return "Linked form trigger status not found"
  }
}

/** Move an existing linked form to `statusLabel` (e.g. when the parent is rejected). */
export async function setLinkedFormStatus(formId: number, statusLabel: string): Promise<void> {
  const [existing, status] = await Promise.all([
    prisma.localDevelopmentAgencyForm.findFirst({ where: { linkedFormId: formId }, select: { id: true } }),
    prisma.formStatus.findFirst({ where: { label: statusLabel } }),
  ])
  if (existing && status) {
    await prisma.localDevelopmentAgencyForm.update({
      where: { id: existing.id },
      data: { formStatusId: status.id },
    })
  }
}
