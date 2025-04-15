import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { funder_id: string } }) {
  const id = parseInt(params.funder_id, 10)

  const record = await prisma.funder.findUnique({
    where: { id: id },
    include: {
      fundingStatus: true,
      locations: true,
      focusAreas: true,
      organisationDetail: true,
      contacts: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { funder_id: string } }) {
  const id = parseInt(params.funder_id, 10)

  try {
    const data = await req.json()

    const updated = await prisma.funder.update({
      where: { id: id },
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
