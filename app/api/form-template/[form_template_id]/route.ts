import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { form_template_id: string } }) {
  const formTemplateId = parseInt(params.form_template_id, 10)

  const record = await prisma.formTemplate.findUnique(
    {
      where: { id: formTemplateId },
      include: {
        localDevelopmentAgencyForms: {
          include: {
            localDevelopmentAgency: true,
          },
        },
      }
    })

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { form_template_id: string } }) {
  const id = parseInt(params.form_template_id, 10)

  try {
    const data = await req.json()

    const updated = await prisma.formTemplate.update({
      where: { id: id },
      data: data
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { form_template_id: string } }) {
  try {
    const formTemplateId = Number(params.form_template_id)
    const deletedFormTemplate = await prisma.formTemplate.delete({
      where: { id: formTemplateId }
    })
    return NextResponse.json(deletedFormTemplate)
  } catch {
    return NextResponse.json({ error: "Failed to delete form template" }, { status: 500 })
  }
}
