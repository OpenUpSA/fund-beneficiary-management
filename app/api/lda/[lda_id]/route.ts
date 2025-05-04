import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_id: string } }) {
  const ldaId = parseInt(params.lda_id, 10)

  const record = await prisma.localDevelopmentAgency.findUnique({
    where: { id: ldaId },
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
      },
      organisationDetail: true,
      contacts: true,
      media: true,
      documents: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { lda_id: string } }) {
  const ldaId = parseInt(params.lda_id, 10);

  try {
    const data = await req.json();

    const updateData: Prisma.LocalDevelopmentAgencyUpdateArgs["data"] = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.about !== undefined) updateData.about = data.about;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.fundingStatusId !== undefined) {
      updateData.fundingStatus = { connect: { id: data.fundingStatusId } };
    }
    if (data.fundingStart !== undefined) updateData.fundingStart = data.fundingStart;
    if (data.fundingEnd !== undefined) updateData.fundingEnd = data.fundingEnd;
    if (data.locationId !== undefined) {
      updateData.location = { connect: { id: data.locationId } };
    }
    if (data.programmeOfficerId !== undefined) {
      updateData.programmeOfficer = { connect: { id: data.programmeOfficerId } };
    }
    if (data.developmentStageId !== undefined) {
      updateData.developmentStage = { connect: { id: data.developmentStageId } };
    }
    if (data.totalFundingRounds !== undefined) {
      updateData.totalFundingRounds = data.totalFundingRounds;
    }
    if (Array.isArray(data.focusAreas)) {
      updateData.focusAreas = {
        set: [],
        connect: data.focusAreas.map((id: number) => ({ id })),
      };
    }
    if (Array.isArray(data.funds)) {
      updateData.funds = {
        set: [],
        connect: data.funds.map((id: number) => ({ id })),
      };
    }
    if (data.organisationDetailId !== undefined) {
      updateData.organisationDetail = { connect: { id: data.organisationDetailId } };
    }

    const updated = await prisma.localDevelopmentAgency.update({
      where: { id: ldaId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update LDA:", err);
    return NextResponse.json({ error: "Failed to update", detail: (err as Error).message }, { status: 500 });
  }
}
