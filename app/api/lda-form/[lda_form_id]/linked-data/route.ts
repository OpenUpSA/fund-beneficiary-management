import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"

interface RouteParams {
  params: { lda_form_id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lda_form_id } = params
    const { searchParams } = new URL(request.url)
    const sourceField = searchParams.get("sourceField") || "community_gardens"
    const nameField = searchParams.get("nameField") || "garden_name"
    const requiredFields = searchParams.get("requiredFields")?.split(",") || [
      "garden_name", "garden_size", "garden_address", "contact_person", "contact_number", "external_support"
    ]

    // Fetch the form data
    const ldaForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: parseInt(lda_form_id) },
      select: { formData: true }
    })

    if (!ldaForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    const formData = (ldaForm.formData as Record<string, string>) || {}

    // Parse the indices array for the source field - must be array format [1,3,4]
    let indices: number[] = []
    try {
      const indicesValue = formData[sourceField]
      if (indicesValue) {
        const parsed = JSON.parse(indicesValue)
        if (Array.isArray(parsed)) {
          indices = parsed
        }
      }
    } catch {
      indices = []
    }

    // Extract gardens data based on valid indices
    const gardens: Array<{ id: number; name: string; isComplete: boolean; fields: Record<string, string> }> = []
    const orphanedFields: string[] = []

    // Find all fields that belong to this source field
    const sourceFieldPrefix = `${sourceField}_`
    const allSourceFields = Object.keys(formData).filter(key => key.startsWith(sourceFieldPrefix))

    // For each valid index, extract garden data
    indices.forEach(idx => {
      const gardenFields: Record<string, string> = {}
      const suffix = `_${idx}`
      
      allSourceFields.forEach(key => {
        if (key.endsWith(suffix)) {
          // Extract field name: community_gardens_garden_name_1 -> garden_name
          const fieldName = key.replace(sourceFieldPrefix, "").replace(suffix, "")
          gardenFields[fieldName] = formData[key]
        }
      })

      const name = gardenFields[nameField] || `Garden ${idx}`
      
      // Check if all required fields are filled
      const isComplete = requiredFields.every(reqField => {
        const value = gardenFields[reqField]?.trim()
        return value !== undefined && value !== ""
      })

      gardens.push({
        id: idx,
        name,
        isComplete,
        fields: gardenFields
      })
    })

    // Find orphaned fields (fields for indices not in the array)
    allSourceFields.forEach(key => {
      const match = key.match(/_(\d+)$/)
      if (match) {
        const fieldIndex = parseInt(match[1])
        if (!indices.includes(fieldIndex)) {
          orphanedFields.push(key)
        }
      }
    })

    // Also find orphaned data in linked sections (beneficiaries, yields)
    const linkedPrefixes = ["garden_beneficiaries_", "garden_yields_"]
    linkedPrefixes.forEach(prefix => {
      Object.keys(formData).forEach(key => {
        if (key.startsWith(prefix)) {
          const match = key.match(/_(\d+)(?:_|$)/)
          if (match) {
            const fieldIndex = parseInt(match[1])
            if (!indices.includes(fieldIndex)) {
              orphanedFields.push(key)
            }
          }
        }
      })
    })

    return NextResponse.json({
      gardens: gardens.filter(g => g.isComplete),
      allGardens: gardens,
      indices,
      orphanedFields,
      sourceField
    })

  } catch (error) {
    console.error("Error fetching linked data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lda_form_id } = params
    const body = await request.json()
    const { fieldsToDelete } = body as { fieldsToDelete: string[] }

    if (!fieldsToDelete || !Array.isArray(fieldsToDelete)) {
      return NextResponse.json({ error: "fieldsToDelete array required" }, { status: 400 })
    }

    // Fetch current form data
    const ldaForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: parseInt(lda_form_id) },
      select: { formData: true }
    })

    if (!ldaForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    const formData = (ldaForm.formData as Record<string, string>) || {}

    // Remove orphaned fields
    fieldsToDelete.forEach(field => {
      delete formData[field]
    })

    // Update form data
    await prisma.localDevelopmentAgencyForm.update({
      where: { id: parseInt(lda_form_id) },
      data: { formData }
    })

    return NextResponse.json({ 
      success: true, 
      deletedCount: fieldsToDelete.length 
    })

  } catch (error) {
    console.error("Error deleting orphaned fields:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
