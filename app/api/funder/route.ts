import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.funder.findMany({
    include: {
      fundingStatus: true,
      focusAreas: true
    },
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const query = {
      data: {
        name: data.name,
        about: data.about,
        amount: data.amount,
        fundingStatus: {
          connect: { id: data.fundingStatusId },
        },
        fundingStart: data.fundingStart,
        fundingEnd: data.fundingEnd,
        locations: {
          connect: data.locations.map((locationId: number) => ({ id: locationId })),
        },
        focusAreas: {
          connect: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
        organisationDetail: { create: {} }
      },
    }
    const record = await prisma.funder.create(query)

    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}