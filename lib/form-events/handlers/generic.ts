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

/**
 * On approval, save all prefilled field values to formData
 * This ensures prefilled data is locked in after approval
 */
async function onFormApproved(context: FormEventContext): Promise<void> {
  const { form, formTemplate } = context

  // Get the form template's form definition to find prefill fields
  const templateForm = (formTemplate as unknown as { form?: Form }).form
  if (!templateForm?.sections) {
    return
  }

  // Get linked form data if this form has a linked form
  let linkedFormData: Record<string, unknown> | null = null
  const currentForm = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: form.id },
    include: {
      linkedForm: {
        select: { formData: true }
      },
      localDevelopmentAgency: {
        include: {
          organisationDetail: true,
          operations: true,
          staffMembers: true,
        }
      }
    }
  })

  if (currentForm?.linkedForm?.formData) {
    linkedFormData = currentForm.linkedForm.formData as Record<string, unknown>
  }

  const organisation = currentForm?.localDevelopmentAgency
  const currentFormData = (form.formData as Prisma.JsonObject) || {}
  const prefillDataToSave: Record<string, unknown> = {}

  // Iterate through all sections and fields to find prefill configurations
  for (const section of templateForm.sections) {
    if (!section.fields) continue

    for (const field of section.fields) {
      // Check if field has prefill config and value is not already in formData
      if (field?.prefill && !(field.name in currentFormData)) {
        const prefill = field.prefill as { source: string; path: string }
        const value = getPrefillValue(prefill, linkedFormData, organisation)
        if (value !== undefined && value !== null) {
          prefillDataToSave[field.name] = value
        }
      }

      // Check nested fields (for complex field types)
      if (field.fields) {
        for (const subfield of field.fields) {
          const subfieldKey = `${field.name}_${subfield.name}`
          if (subfield?.prefill && !(subfieldKey in currentFormData)) {
            const subprefill = subfield.prefill as { source: string; path: string }
            const subvalue = getPrefillValue(subprefill, linkedFormData, organisation)
            if (subvalue !== undefined && subvalue !== null) {
              prefillDataToSave[subfieldKey] = subvalue
            }
          }
        }
      }
    }
  }

  // Save prefilled data to the database if any values were found
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

/**
 * Get prefill value based on source type
 */
function getPrefillValue(
  prefill: { source: string; path: string },
  linkedFormData: Record<string, unknown> | null,
  organisation: {
    organisationDetail?: Record<string, unknown> | null
    operations?: Record<string, unknown> | null
    staffMembers?: Array<{
      firstName: string
      lastName: string
      gender: string
      position?: string | null
      isCommittee: boolean
    }>
  } | null | undefined
): unknown {
  switch (prefill.source) {
    case 'linkedForm':
      if (linkedFormData && prefill.path) {
        return linkedFormData[prefill.path]
      }
      break

    case 'organisation_detail':
      if (organisation?.organisationDetail && prefill.path) {
        return organisation.organisationDetail[prefill.path]
      }
      break

    case 'organisation_operations':
      if (organisation?.operations && prefill.path) {
        return organisation.operations[prefill.path]
      }
      break

    case 'defaultValue':
      if (prefill.path) {
        return prefill.path
      }
      break
  }

  return undefined
}

// Export handlers registry for generic handlers
export const genericHandlers: { [event in FormEventType]?: FormEventHandler[] } = {
  approved: [onFormApproved]
}
