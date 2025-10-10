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
    // Get the field name and value from the request body
    const { fieldName, fieldValue } = await req.json()

    if (!fieldName) {
      return NextResponse.json(
        { error: "Field name is required" },
        { status: 400 }
      )
    }

    // First, get the current form data and LDA ID for permission check
    const currentForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: { 
        formData: true,
        localDevelopmentAgencyId: true
      }
    })

    if (!currentForm) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(user, currentForm.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Update only the specific field in the form data
    // Ensure formData is treated as an object for spreading
    const currentFormData = (typeof currentForm.formData === 'object' && currentForm.formData !== null) 
      ? currentForm.formData 
      : {};
      
    const updatedFormData = {
      ...currentFormData as Record<string, unknown>,
      [fieldName]: fieldValue
    }

    // Update the form with the modified form data
    const updated = await prisma.localDevelopmentAgencyForm.update({
      where: { id: ldaFormId },
      data: {
        formData: updatedFormData
      },
      select: {
        id: true,
        formData: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `Field '${fieldName}' updated successfully`,
      data: updated
    })
  } catch (error) {
    console.error("Error updating field:", error)
    return NextResponse.json(
      { error: "Failed to update field", details: (error as Error).message },
      { status: 500 }
    )
  }
}
