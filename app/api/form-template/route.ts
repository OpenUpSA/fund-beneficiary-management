import { NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.formTemplate.findMany(
    {
      include: {
        localDevelopmentAgencyForms: {
          include: {
            localDevelopmentAgency: true
          },
        },
      },
    }

  )
  return NextResponse.json(records)
}
