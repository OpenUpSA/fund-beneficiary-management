import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { fund_id: string } }) {
  const fundId = parseInt(params.fund_id, 10)

  const record = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      fundingStatus: true,
      locations: true,
      focusAreas: true,
      funder: true,
      localDevelopmentAgencies: true,
      organisationDetail: true,
      contacts: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}
