/**
 * Narrative Report Event Handlers
 * 
 * Handles form lifecycle events specific to narrative reports.
 * Key functionality:
 * - On 'created': Copy data from the previous narrative report
 *   - Community gardens (all data)
 *   - Garden beneficiaries (all data)
 *   - Garden yields (item names only, reset values)
 *   - Challenges (unresolved only, mark as 'existing')
 *   - Partnerships (active only, mark as 'existing')
 */

import prisma from "@/db"
import { FormEventType, FormEventHandler, FormEventContext } from "../index"
import { Prisma } from "@prisma/client"

interface GardenYieldItem {
  name?: string
  [key: string]: unknown
}

interface GardenYieldsData {
  [gardenId: string]: {
    items?: GardenYieldItem[]
    [key: string]: unknown
  }
}

/**
 * Copy data from the previous narrative report when a new one is created
 */
async function onNarrativeReportCreated(context: FormEventContext): Promise<void> {
  const { form, ldaId } = context

  // Find the most recent approved narrative report for this LDA
  const previousReport = await prisma.localDevelopmentAgencyForm.findFirst({
    where: {
      localDevelopmentAgencyId: ldaId,
      formTemplateId: form.formTemplateId,
      id: { not: form.id }, // Exclude current form
      approved: { not: null }, // Only approved reports
    },
    orderBy: {
      approved: 'desc'
    },
    select: {
      formData: true,
      id: true
    }
  })

  if (!previousReport || !previousReport.formData) {
    return // No previous report to copy from
  }

  const previousData = previousReport.formData as Prisma.JsonObject
  const newFormData: Prisma.JsonObject = (form.formData as Prisma.JsonObject) || {}

  // 1. Copy community gardens (all data)
  copyFieldData(previousData, newFormData, 'community_gardens')

  // 2. Copy garden beneficiaries (all data)
  copyGardenBeneficiariesData(previousData, newFormData)

  // 3. Copy garden yields (item names only, reset numeric values)
  copyGardenYieldsData(previousData, newFormData)

  // 4. Copy unresolved challenges (mark as 'existing')
  copyChallengesData(previousData, newFormData)

  // 5. Copy active partnerships (mark as 'existing')
  copyPartnershipsData(previousData, newFormData)

  // Update the form with the copied data
  await prisma.localDevelopmentAgencyForm.update({
    where: { id: form.id },
    data: { formData: newFormData }
  })
}

/**
 * Simple field copy - copies all data for a field
 */
function copyFieldData(
  source: Prisma.JsonObject,
  target: Prisma.JsonObject,
  fieldName: string
): void {
  if (source[fieldName] !== undefined) {
    target[fieldName] = source[fieldName]
  }
}

/**
 * Copy garden beneficiaries data
 * Copies all employee and beneficiary data per garden
 */
function copyGardenBeneficiariesData(
  source: Prisma.JsonObject,
  target: Prisma.JsonObject
): void {
  // Copy the main garden_beneficiaries field if it exists
  if (source['garden_beneficiaries'] !== undefined) {
    target['garden_beneficiaries'] = source['garden_beneficiaries']
  }

  // Also copy any related fields that start with garden_beneficiaries_
  for (const key of Object.keys(source)) {
    if (key.startsWith('garden_beneficiaries_')) {
      target[key] = source[key]
    }
  }
}

/**
 * Copy garden yields data - only item names, reset numeric values
 */
function copyGardenYieldsData(
  source: Prisma.JsonObject,
  target: Prisma.JsonObject
): void {
  // Check if garden_yields exists and is an object
  if (!source['garden_yields'] || typeof source['garden_yields'] !== 'object') {
    return
  }

  const sourceYields = source['garden_yields'] as GardenYieldsData
  const targetYields: GardenYieldsData = {}

  // Iterate through each garden's yields
  for (const gardenId of Object.keys(sourceYields)) {
    const gardenData = sourceYields[gardenId]
    if (gardenData && gardenData.items && Array.isArray(gardenData.items)) {
      // Copy only item names, reset numeric values
      targetYields[gardenId] = {
        items: gardenData.items.map((item: GardenYieldItem) => ({
          name: item.name || '',
          units_planted: '',
          harvested_kg: '',
          sold_kg: ''
        }))
      }
    }
  }

  if (Object.keys(targetYields).length > 0) {
    target['garden_yields'] = targetYields as unknown as Prisma.JsonValue
  }
}

/**
 * Copy challenges data - only unresolved challenges, mark as 'existing'
 */
function copyChallengesData(
  source: Prisma.JsonObject,
  target: Prisma.JsonObject
): void {
  // Find all challenge-related fields (repeatable format: challenges_fieldname_index)
  const challengeIndices = new Set<number>()
  const challengeFields: { [key: string]: unknown } = {}

  // First pass: identify all challenge indices and collect their data
  for (const key of Object.keys(source)) {
    if (key.startsWith('challenges_')) {
      const match = key.match(/^challenges_(.+)_(\d+)$/)
      if (match) {
        const index = parseInt(match[2], 10)
        challengeIndices.add(index)
        challengeFields[key] = source[key]
      }
    }
  }

  // Second pass: filter unresolved challenges and copy with new type
  let newIndex = 1
  const sortedIndices = Array.from(challengeIndices).sort((a, b) => a - b)

  for (const oldIndex of sortedIndices) {
    const resolvedKey = `challenges_resolved_${oldIndex}`
    const resolvedValue = challengeFields[resolvedKey]

    // Skip if challenge is resolved (resolved === 'true' or true)
    if (resolvedValue === 'true' || resolvedValue === true) {
      continue
    }

    // Copy this challenge with new index and mark as 'existing'
    for (const key of Object.keys(challengeFields)) {
      if (key.endsWith(`_${oldIndex}`)) {
        const fieldName = key.replace(`_${oldIndex}`, `_${newIndex}`)
        
        // Change challenge_type to 'existing'
        if (key === `challenges_challenge_type_${oldIndex}`) {
          target[fieldName] = 'existing'
        } else {
          target[fieldName] = challengeFields[key] as Prisma.JsonValue
        }
      }
    }
    newIndex++
  }

  // Set the challenges array value to track indices
  if (newIndex > 1) {
    target['challenges'] = JSON.stringify(Array.from({ length: newIndex - 1 }, (_, i) => i + 1))
  }
}

/**
 * Copy partnerships data - only active partnerships (not marked for removal), mark as 'existing'
 */
function copyPartnershipsData(
  source: Prisma.JsonObject,
  target: Prisma.JsonObject
): void {
  // Find all partnership-related fields (repeatable format: partnerships_fieldname_index)
  const partnershipIndices = new Set<number>()
  const partnershipFields: { [key: string]: unknown } = {}

  // First pass: identify all partnership indices and collect their data
  for (const key of Object.keys(source)) {
    if (key.startsWith('partnerships_')) {
      const match = key.match(/^partnerships_(.+)_(\d+)$/)
      if (match) {
        const index = parseInt(match[2], 10)
        partnershipIndices.add(index)
        partnershipFields[key] = source[key]
      }
    }
  }

  // Second pass: filter active partnerships and copy with new type
  let newIndex = 1
  const sortedIndices = Array.from(partnershipIndices).sort((a, b) => a - b)

  for (const oldIndex of sortedIndices) {
    const removeKey = `partnerships_remove_partner_${oldIndex}`
    const removeValue = partnershipFields[removeKey]

    // Skip if partnership is marked for removal
    if (removeValue === 'true' || removeValue === true) {
      continue
    }

    // Copy this partnership with new index and mark as 'existing'
    for (const key of Object.keys(partnershipFields)) {
      if (key.endsWith(`_${oldIndex}`)) {
        const fieldName = key.replace(`_${oldIndex}`, `_${newIndex}`)
        
        // Change partnership_type to 'existing'
        if (key === `partnerships_partnership_type_${oldIndex}`) {
          target[fieldName] = 'existing'
        } else {
          target[fieldName] = partnershipFields[key] as Prisma.JsonValue
        }
      }
    }
    newIndex++
  }

  // Set the partnerships array value to track indices
  if (newIndex > 1) {
    target['partnerships'] = JSON.stringify(Array.from({ length: newIndex - 1 }, (_, i) => i + 1))
  }
}

// Export handlers registry for narrative reports
export const narrativeReportHandlers: { [event in FormEventType]?: FormEventHandler[] } = {
  created: [onNarrativeReportCreated]
}
