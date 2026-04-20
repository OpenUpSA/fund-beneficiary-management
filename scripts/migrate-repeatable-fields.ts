/**
 * Migration script to convert old count-format repeatable field values to array format
 * 
 * Old format: "2" (meaning 2 items with indices 1, 2)
 * New format: "[1,2]" (explicit array of indices)
 * 
 * Run with: npx ts-node scripts/migrate-repeatable-fields.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// List of repeatable field names to check
const REPEATABLE_FIELDS = [
  'community_gardens',
  'challenges',
  'successes',
  'partnerships',
  'case_studies',
  // Add other repeatable field names as needed
]

async function migrateRepeatableFields() {
  console.log('Starting migration of repeatable field formats...')
  
  // Get all forms with formData
  const forms = await prisma.localDevelopmentAgencyForm.findMany({
    where: {
      formData: { not: undefined }
    },
    select: {
      id: true,
      formData: true
    }
  })
  
  console.log(`Found ${forms.length} forms to check`)
  
  let updatedCount = 0
  let fieldsUpdated = 0
  
  for (const form of forms) {
    const formData = form.formData as Record<string, unknown>
    if (!formData) continue
    
    const updates: Record<string, string> = {}
    
    for (const fieldName of REPEATABLE_FIELDS) {
      const value = formData[fieldName]
      
      if (value === undefined || value === null) continue
      
      // Check if it's a string that parses to a number (old format)
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        
        if (typeof parsed === 'number' && parsed > 0) {
          // Convert count to indices array
          const indices = Array.from({ length: parsed }, (_, i) => i + 1)
          updates[fieldName] = JSON.stringify(indices)
          console.log(`  Form ${form.id}: ${fieldName} "${value}" -> "${JSON.stringify(indices)}"`)
          fieldsUpdated++
        }
      } catch {
        // Not valid JSON, skip
      }
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await prisma.$executeRaw`
        UPDATE "LocalDevelopmentAgencyForm"
        SET "formData" = COALESCE("formData", '{}'::jsonb) || ${JSON.stringify(updates)}::jsonb,
            "updatedAt" = NOW()
        WHERE id = ${form.id}
      `
      updatedCount++
    }
  }
  
  console.log(`\nMigration complete!`)
  console.log(`  Forms updated: ${updatedCount}`)
  console.log(`  Fields converted: ${fieldsUpdated}`)
}

migrateRepeatableFields()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
