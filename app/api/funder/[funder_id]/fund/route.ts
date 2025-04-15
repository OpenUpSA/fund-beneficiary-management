import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { funder_id: string } }) {
  const funderId = parseInt(params.funder_id, 10);

  const records = await prisma.fund.findMany({
    where: { funderId: funderId },
    include: {
      fundingStatus: true,
      focusAreas: true,
      locations: true,
      funder: true,
      localDevelopmentAgencies: true
    },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const query = {
      data: {
        funder: {
          connect: { id: data.funderId }
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
          connect: data.locations.map((locationId: number) => ({ id: locationId })),
        },
        focusAreas: {
          connect: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
        organisationDetail: { create: {} }
      },
    }
    const record = await prisma.fund.create(query)

    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}