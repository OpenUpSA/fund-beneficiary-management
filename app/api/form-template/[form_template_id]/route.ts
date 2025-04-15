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
