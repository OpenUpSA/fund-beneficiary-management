/**
 * Generic Event Handlers
 *
 * Handlers that run for ALL forms regardless of category.
 * These run before category-specific handlers.
 */

import prisma from "@/db"
import { FormEventType, FormEventHandler, FormEventContext } from "../index"
import { Prisma } from "@prisma/client"
import { Form } from "@/types/forms"

type FundingContext = {
  ldaId: number
  fundingStart: Date
  fundingEnd: Date
}

type Organisation = {
  organisationDetail?: Record<string, unknown> | null
  operations?: Record<string, unknown> | null
  staffMembers: Array<{
    firstName: string
    lastName: string
    gender: string
    position?: string | null
    isCommittee: boolean
  }>
  [key: string]: unknown
}

/**
 * On approval, compute all prefilled field values and save them to formData.
 *
 * For locked fields (config.locked: true): always re-compute and overwrite.
 * System owns these values — they reflect the latest approved state at approval time.
 *
 * For non-locked prefill fields: only write if the field is missing from formData.
 * This preserves any value the user may have entered.
 */
async function onFormApproved(context: FormEventContext): Promise<void> {
  const { form, formTemplate } = context

  const templateForm = (formTemplate as unknown as { form?: Form }).form
  if (!templateForm?.sections) return

  const currentForm = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: form.id },
    include: {
      linkedForm: { select: { formData: true } },
      localDevelopmentAgency: {
        include: {
          organisationDetail: true,
          operations: true,
          staffMembers: true,
        }
      }
    }
  })

  const linkedFormData = (currentForm?.linkedForm?.formData ?? null) as Record<string, unknown> | null
  const organisation = currentForm?.localDevelopmentAgency as Organisation | null | undefined
  const currentFormData = (form.formData as Prisma.JsonObject) || {}

  const fundingContext: FundingContext | null =
    currentForm?.fundingStart && currentForm?.fundingEnd
      ? {
          ldaId: currentForm.localDevelopmentAgencyId,
          fundingStart: currentForm.fundingStart,
          fundingEnd: currentForm.fundingEnd,
        }
      : null

  const prefillDataToSave: Record<string, unknown> = {}

  async function processPrefillField(
    key: string,
    prefill: { source: string; path: string },
    isLocked: boolean
  ) {
    // Non-locked: preserve user's value if already present
    if (!isLocked && key in currentFormData) return
    const value = await getPrefillValue(prefill, linkedFormData, organisation, fundingContext)
    if (value !== undefined && value !== null) {
      prefillDataToSave[key] = value as Prisma.JsonValue
    }
  }

  const tasks: Promise<void>[] = []

  for (const section of templateForm.sections) {
    if (!section.fields) continue
    for (const field of section.fields) {
      if (field?.prefill) {
        const isLocked = !!(field.config as Record<string, unknown> | undefined)?.locked
        tasks.push(processPrefillField(field.name, field.prefill as { source: string; path: string }, isLocked))
      }
      if (field.fields) {
        for (const subfield of field.fields) {
          if (subfield?.prefill) {
            const subfieldKey = `${field.name}_${subfield.name}`
            const isLocked = !!(subfield.config as Record<string, unknown> | undefined)?.locked
            tasks.push(processPrefillField(subfieldKey, subfield.prefill as { source: string; path: string }, isLocked))
          }
        }
      }
    }
  }

  await Promise.all(tasks)

  if (Object.keys(prefillDataToSave).length > 0) {
    await prisma.$executeRaw`
      UPDATE "LocalDevelopmentAgencyForm"
      SET "formData" = COALESCE("formData", '{}'::jsonb) || ${JSON.stringify(prefillDataToSave)}::jsonb,
          "updatedAt" = NOW()
      WHERE id = ${form.id}
    `
    console.log(`Saved ${Object.keys(prefillDataToSave).length} prefilled fields for form ${form.id} on approval`)
  }
}

async function getPrefillValue(
  prefill: { source: string; path: string },
  linkedFormData: Record<string, unknown> | null,
  organisation: Organisation | null | undefined,
  fundingContext: FundingContext | null
): Promise<unknown> {
  switch (prefill.source) {
    case 'organisation':
      if (organisation && prefill.path) {
        const v = organisation[prefill.path]
        if (v !== undefined && v !== null) return String(v)
      }
      break

    case 'organisation_detail':
      if (organisation?.organisationDetail && prefill.path) {
        const v = organisation.organisationDetail[prefill.path]
        if (v !== undefined && v !== null) return String(v)
      }
      break

    case 'organisation_operations':
      if (organisation?.operations && prefill.path) {
        const v = organisation.operations[prefill.path]
        if (v !== undefined && v !== null) return String(v)
      }
      break

    case 'organisation_staff':
      if (prefill.path === 'organisation_staff_members') {
        return organisation?.staffMembers
          .filter(m => !m.isCommittee)
          .map(m => ({ name: `${m.firstName} ${m.lastName}`, gender: m.gender, position: m.position }))
      } else if (prefill.path === 'organisation_board_members') {
        return organisation?.staffMembers
          .filter(m => m.isCommittee)
          .map(m => ({ name: `${m.firstName} ${m.lastName}`, gender: m.gender }))
      }
      break

    case 'linkedForm':
      if (linkedFormData && prefill.path) return linkedFormData[prefill.path]
      break

    case 'defaultValue':
      if (prefill.path) return prefill.path
      break

    case 'core_grant_funding': {
      if (!fundingContext) return "0"
      const grantForm = await prisma.localDevelopmentAgencyForm.findFirst({
        where: {
          localDevelopmentAgencyId: fundingContext.ldaId,
          approved: { not: null },
          formTemplate: { formCategory: 'grant_funding' },
          fundingStart: { lte: fundingContext.fundingStart },
          fundingEnd: { gte: fundingContext.fundingStart },
        },
        orderBy: { approved: 'desc' },
        select: { amount: true },
      })
      return grantForm?.amount ? String(Number(grantForm.amount) / 4) : "0"
    }

    case 'fris_funding': {
      if (!fundingContext) return "0"
      const frisClaims = await prisma.localDevelopmentAgencyForm.findMany({
        where: {
          localDevelopmentAgencyId: fundingContext.ldaId,
          formStatus: { label: 'Approved' },
          formTemplate: { formCategory: 'fris_claim' },
          approved: { gte: fundingContext.fundingStart, lte: fundingContext.fundingEnd },
        },
        select: { amount: true },
      })
      return String(frisClaims.reduce((sum, c) => sum + Number(c.amount), 0))
    }

    case 'dft_funding': {
      if (!fundingContext) return "0"
      const dftApps = await prisma.localDevelopmentAgencyForm.findMany({
        where: {
          localDevelopmentAgencyId: fundingContext.ldaId,
          formStatus: { label: 'Approved' },
          formTemplate: { formCategory: 'dft_application' },
          approved: { gte: fundingContext.fundingStart, lte: fundingContext.fundingEnd },
        },
        select: { amount: true },
      })
      return String(dftApps.reduce((sum, a) => sum + Number(a.amount), 0))
    }

    case 'carryover_amount': {
      if (!fundingContext) return "0"
      const yearStart = new Date(fundingContext.fundingStart.getFullYear(), 0, 1)
      const prevReport = await prisma.localDevelopmentAgencyForm.findFirst({
        where: {
          localDevelopmentAgencyId: fundingContext.ldaId,
          formStatus: { label: 'Approved' },
          formTemplate: { formCategory: 'finance_report' },
          fundingStart: { gte: yearStart },
          fundingEnd: { lt: fundingContext.fundingStart },
        },
        orderBy: { fundingEnd: 'desc' },
        select: { formData: true },
      })
      if (!prevReport?.formData) return "0"
      const d = prevReport.formData as Record<string, unknown>
      return String(
        Number(d['finance_totals_carryover_amount'] ?? 0) +
        Number(d['finance_totals_total_income'] ?? 0) -
        Number(d['finance_totals_total_expenditure'] ?? 0)
      )
    }
  }

  return undefined
}

export const genericHandlers: { [event in FormEventType]?: FormEventHandler[] } = {
  approved: [onFormApproved]
}
