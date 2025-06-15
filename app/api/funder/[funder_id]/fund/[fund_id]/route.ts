import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { funder_id: string, fund_id: string } }) {
  const fundId = parseInt(params.fund_id, 10)

  const record = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      fundingStatus: true,
      locations: true,
      focusAreas: true,
      funders: true,
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

export async function PUT(req: NextRequest, { params }: { params: { funder_id: string, fund_id: string } }) {
  const funderId = parseInt(params.funder_id, 10)
  const fundId = parseInt(params.fund_id, 10)

  try {
    const data = await req.json()

    const updated = await prisma.fund.update({
      where: { id: fundId },
      data: {
        funders: {
          connect: { id: funderId }
        },
        name: data.name,
        about: data.about,
        amount: data.amount,
        fundingStatus: {
          connect: { id: data.fundingStatusId },
        },
        fundingStart: data.fundingStart,
        fundingEnd: data.fundingEnd,
        locations: {
          set: data.locations.map((locationId: number) => ({ id: locationId })),
        },
        focusAreas: {
          set: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
      }
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
