import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { lda_form_id: string } }
) {
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

    // First, get the current form data
    const currentForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: { formData: true }
    })

    if (!currentForm) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      )
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
