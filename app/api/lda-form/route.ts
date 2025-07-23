import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.localDevelopmentAgencyForm.findMany({
    include: {
      localDevelopmentAgency: true,
      formTemplate: true,
      formStatus: true
    },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    // Get the form template to use its name as the title
    const formTemplate = await prisma.formTemplate.findUnique({
      where: { id: data.formTemplateId },
    })

    if (!formTemplate) {
      return NextResponse.json({ error: "Form template not found" }, { status: 404 })
    }

    // Find the "pending" form status
    const pendingStatus = await prisma.formStatus.findFirst({
      where: { label: "Pending" },
    })

    if (!pendingStatus) {
      return NextResponse.json({ error: "Pending status not found" }, { status: 404 })
    }

    const query = {
      data: {
        ...data,
        title: formTemplate.name,
        formStatusId: pendingStatus.id,
      },
    }
    const record = await prisma.localDevelopmentAgencyForm.create(query)

    return NextResponse.json(record)
  } catch (error) {
    console.error("Error creating LDA form:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}