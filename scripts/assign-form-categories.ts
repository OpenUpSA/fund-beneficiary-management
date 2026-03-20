import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map template names to categories
// Add more mappings as needed
const categoryMappings: Record<string, string> = {
  // DFT related
  'DFT Application': 'dft',
  'DFT Report': 'dft',
  'LDA DFT Application Form': 'dft',
  'LDA DFT Claim Form': 'dft',
  
  // FRIS related
  'FRIS Application': 'fris',
  'FRIS Report': 'fris',
  'FRIS Claim Form': 'fris',
  
  // Grant related
  'Grant Application': 'grant',
  'Grant Funding Application': 'grant',
  'Grant Report': 'grant',
  
  // Narrative reports
  'Narrative Report': 'narrative',
  
  // Garden related
  'Garden Report': 'garden',
  'Garden Application': 'garden',
}

// Fallback: derive category from template name patterns
function deriveCategoryFromName(name: string): string | null {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('dft')) return 'dft'
  if (lowerName.includes('fris')) return 'fris'
  if (lowerName.includes('grant')) return 'grant'
  if (lowerName.includes('narrative')) return 'narrative'
  if (lowerName.includes('garden')) return 'garden'
  if (lowerName.includes('casework')) return 'casework'
  
  return null
}

async function main() {
  console.log('\n📋 Assign Form Categories\n')
  console.log('─'.repeat(50))
  
  try {
    // Get all templates without a category
    const templates = await prisma.formTemplate.findMany({
      where: {
        formCategory: null
      },
      select: {
        id: true,
        name: true,
        templateType: true
      }
    })
    
    if (templates.length === 0) {
      console.log('✅ All templates already have categories assigned.')
      return
    }
    
    console.log(`Found ${templates.length} template(s) without category:\n`)
    
    let updated = 0
    let skipped = 0
    
    for (const template of templates) {
      // Try exact match first
      let category = categoryMappings[template.name]
      
      // Fall back to pattern matching
      if (!category) {
        category = deriveCategoryFromName(template.name) || undefined
      }
      
      if (category) {
        await prisma.formTemplate.update({
          where: { id: template.id },
          data: { formCategory: category }
        })
        console.log(`  ✅ ${template.name} → "${category}"`)
        updated++
      } else {
        console.log(`  ⚠️  ${template.name} → No category found (skipped)`)
        skipped++
      }
    }
    
    console.log('\n' + '─'.repeat(50))
    console.log(`\n✅ Updated: ${updated}`)
    if (skipped > 0) {
      console.log(`⚠️  Skipped: ${skipped} (add mappings to categoryMappings or deriveCategoryFromName)`)
    }
    
  } catch (error) {
    console.error('❌ Failed to assign categories:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
