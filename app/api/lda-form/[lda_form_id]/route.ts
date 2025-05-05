import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const ldaFormId = parseInt(params.lda_form_id, 10)

  const record = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: ldaFormId },
    include: {
      localDevelopmentAgency: true,
      formTemplate: true,
      formStatus: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const ldaFormId = parseInt(params.lda_form_id, 10)

  try {
    const data = await req.json()

    const updated = await prisma.localDevelopmentAgencyForm.update({
      where: { id: ldaFormId },
      data: {
        title: data.title,
        submitted: data.submitted,
        dueDate: data.dueDate,
        approved: data.approved,
        formStatus: {
          connect: { id: data.formStatusId },
        },

      }
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  try {
    const ldaFormId = Number(params.lda_form_id)
    const deletedLDAForm = await prisma.localDevelopmentAgencyForm.delete({
      where: { id: ldaFormId }
    })
    return NextResponse.json(deletedLDAForm)
  } catch {
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 })
  }
}
