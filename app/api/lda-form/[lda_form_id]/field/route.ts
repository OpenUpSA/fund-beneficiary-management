import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { lda_form_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ldaFormId = parseInt(params.lda_form_id, 10)

  if (isNaN(ldaFormId)) {
    return NextResponse.json(
      { error: "Invalid form ID" },
      { status: 400 }
    )
  }

  try {
    // Support both single field and batch fields
    const body = await req.json()
    
    // Build the fields object to merge
    let fieldsToMerge: Record<string, unknown> = {}
    
    if (body.fields && typeof body.fields === 'object') {
      // Batch mode: { fields: { fieldName1: value1, fieldName2: value2, ... } }
      fieldsToMerge = body.fields
    } else if (body.fieldName) {
      // Single field mode (backwards compatible): { fieldName: "...", fieldValue: "..." }
      fieldsToMerge = { [body.fieldName]: body.fieldValue }
    } else {
      return NextResponse.json(
        { error: "Field name or fields object is required" },
        { status: 400 }
      )
    }

    // Permission check: get LDA ID
    const currentForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: { 
        localDevelopmentAgencyId: true
      }
    })

    if (!currentForm) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    if (!permissions.canViewLDA(user, currentForm.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Use PostgreSQL's atomic jsonb concatenation to avoid read-modify-write race conditions.
    // The || operator merges the new fields into existing formData atomically in a single query.
    await prisma.$executeRaw`
      UPDATE "LocalDevelopmentAgencyForm"
      SET "formData" = COALESCE("formData", '{}'::jsonb) || ${JSON.stringify(fieldsToMerge)}::jsonb,
          "updatedAt" = NOW()
      WHERE id = ${ldaFormId}
    `

    return NextResponse.json({
      success: true,
      message: `${Object.keys(fieldsToMerge).length} field(s) updated successfully`
    })
  } catch (error) {
    console.error("Error updating field:", error)
    return NextResponse.json(
      { error: "Failed to update field", details: (error as Error).message },
      { status: 500 }
    )
  }
}
