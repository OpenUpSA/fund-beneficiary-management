import prisma from "@/db"
import { Prisma, Gender } from "@prisma/client"
import { Form } from "@/types/forms"

type StaffMember = {
  firstName: string
  lastName: string
  gender: Gender
  position?: string | null
  isCommittee: boolean
}

type OrganisationWithDetails = {
  organisationDetail?: { [key: string]: unknown } | null
  operations?: { [key: string]: unknown } | null
  staffMembers: StaffMember[]
}

type FundingContext = {
  ldaId: number
  fundingStart: Date
  fundingEnd: Date
}

async function getPrefillData(
  organisation: OrganisationWithDetails,
  prefill: { source: string; path: string },
  linkedFormData?: Record<string, unknown> | null,
  fundingContext?: FundingContext
): Promise<unknown> {
  switch (prefill.source) {
    case 'organisation':
      if (organisation && prefill.path) {
        const value = organisation[prefill.path as keyof typeof organisation]
        if (value !== undefined && value !== null) return String(value)
      }
      break

    case 'organisation_detail':
      if (organisation.organisationDetail && prefill.path) {
        const v = organisation.organisationDetail[prefill.path]
        if (v !== undefined && v !== null) return String(v)
      }
      break

    case 'organisation_operations':
      if (organisation.operations && prefill.path) {
        const v = organisation.operations[prefill.path]
        if (v !== undefined && v !== null) return String(v)
      }
      break

    case 'organisation_staff':
      if (prefill.path === 'organisation_staff_members') {
        return organisation.staffMembers
          .filter(m => !m.isCommittee)
          .map(m => ({ name: `${m.firstName} ${m.lastName}`, gender: m.gender, position: m.position }))
      } else if (prefill.path === 'organisation_board_members') {
        return organisation.staffMembers
          .filter(m => m.isCommittee)
          .map(m => ({ name: `${m.firstName} ${m.lastName}`, gender: m.gender }))
      }
      break

    case 'linkedForm':
      if (linkedFormData && prefill.path) {
        const v = linkedFormData[prefill.path]
        if (v !== undefined && v !== null) return v
      }
      break

    case 'defaultValue':
      if (prefill.path) return prefill.path
      break

    case 'core_grant_funding': {
      if (!fundingContext) break
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
      if (grantForm?.amount) return String(Number(grantForm.amount) / 4)
      return "0"
    }

    case 'fris_funding': {
      if (!fundingContext) break
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
      if (!fundingContext) break
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
}

/**
 * Fetches the LDA form record, runs all prefill sources for fields not already
 * in formData, and returns the merged formData plus a map of only the newly
 * computed values (so callers can decide whether to persist them).
 */
export async function applyPrefill(ldaFormId: number, savedFormData: Record<string, unknown>): Promise<{
  mergedData: Record<string, unknown>
  newPrefills: Record<string, Prisma.JsonValue>
}> {
  const record = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: ldaFormId },
    include: {
      localDevelopmentAgency: {
        include: { organisationDetail: true, operations: true, staffMembers: true },
      },
      formTemplate: true,
      linkedForm: true,
    },
  })

  if (!record?.formTemplate?.form) {
    return { mergedData: savedFormData, newPrefills: {} }
  }

  const formData = { ...savedFormData }
  const formTemplate = record.formTemplate.form as unknown as Form
  const organisation = record.localDevelopmentAgency
  const linkedFormData = record.linkedForm?.formData as Record<string, unknown> | null
  const fundingContext: FundingContext = {
    ldaId: record.localDevelopmentAgencyId,
    fundingStart: record.fundingStart,
    fundingEnd: record.fundingEnd,
  }

  const prefillTasks: Array<{ key: string; promise: Promise<unknown> }> = []

  for (const section of formTemplate.sections) {
    if (!section.fields) continue
    for (const field of section.fields) {
      if (field?.prefill && !(field.name in formData)) {
        prefillTasks.push({
          key: field.name,
          promise: getPrefillData(organisation, field.prefill as { source: string; path: string }, linkedFormData, fundingContext),
        })
      }
      if (field.fields) {
        for (const subfield of field.fields) {
          if (subfield?.prefill) {
            const key = `${field.name}_${subfield.name}`
            if (!(key in formData)) {
              prefillTasks.push({
                key,
                promise: getPrefillData(organisation, subfield.prefill as { source: string; path: string }, linkedFormData, fundingContext),
              })
            }
          }
        }
      }
    }
  }

  const results = await Promise.all(prefillTasks.map(t => t.promise))
  const newPrefills: Record<string, Prisma.JsonValue> = {}

  results.forEach((value, i) => {
    if (value !== undefined && value !== null) {
      formData[prefillTasks[i].key] = value as Prisma.JsonValue
      newPrefills[prefillTasks[i].key] = value as Prisma.JsonValue
    }
  })

  return { mergedData: formData, newPrefills }
}
