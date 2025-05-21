import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  console.log(session)
  const records = await prisma.localDevelopmentAgency.findMany({
    include: {
      fundingStatus: true,
      focusAreas: true,
      location: true,
      programmeOfficer: true,
      developmentStage: true,
      funds: {
        include: {
          funder: true
        }
      }
    },
  });

  return NextResponse.json(records);
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
        location: {
          connect: { id: data.locationId },
        },
        programmeOfficer: {
          connect: { id: data.programmeOfficerId }
        },
        developmentStage: {
          connect: { id: data.developmentStageId }
        },
        totalFundingRounds: data.totalFundingRounds,
        focusAreas: {
          connect: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
        funds: {
          connect: data.funds.map((fundId: number) => ({ id: fundId })),
        },
        organisationDetail: { create: {} }
      },
    }
    const record = await prisma.localDevelopmentAgency.create(query)

    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}