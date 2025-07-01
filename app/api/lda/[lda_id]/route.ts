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
          funders: true
        }
      },
      organisationDetail: true,
      contacts: true,
      media: true,
      documents: true,
      operations: true,
      userAccess: true,
      staffMembers: true,
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { lda_id: string } }) {
  try {
    const ldaId = parseInt(params.lda_id);
    const data = await req.json();

    const ldaData: Prisma.LocalDevelopmentAgencyUpdateArgs["data"] = {};
    const orgDetailData: Prisma.OrganisationDetailUpdateArgs["data"] = {};

    // --- LocalDevelopmentAgency Fields ---
    if (data.name !== undefined) ldaData.name = data.name;
    if (data.about !== undefined) ldaData.about = data.about;
    if (data.totalFundingRounds !== undefined) ldaData.totalFundingRounds = data.totalFundingRounds;
    if (data.amount !== undefined) ldaData.amount = data.amount;
    if (data.fundingStart !== undefined) ldaData.fundingStart = data.fundingStart;
    if (data.fundingEnd !== undefined) ldaData.fundingEnd = data.fundingEnd;
    if (data.developmentStageId !== undefined) {
      ldaData.developmentStage = { connect: { id: parseInt(data.developmentStageId) } };
    }
    if (data.fundingStatusId !== undefined) {
      ldaData.fundingStatus = { connect: { id: data.fundingStatusId } };
    }
    if (data.locationId !== undefined) {
      ldaData.location = { connect: { id: data.locationId } };
    }
    if (data.programmeOfficerId !== undefined) {
      ldaData.programmeOfficer = { connect: { id: parseInt(data.programmeOfficerId) } };
    }
    if (data.registrationStatus !== undefined) ldaData.registrationStatus = data.registrationStatus;
    if (data.registrationCode !== undefined) ldaData.registrationCode = data.registrationCode;
    if (data.registrationDate !== undefined) ldaData.registrationDate = data.registrationDate;
    if (data.organisationStatus !== undefined) ldaData.organisationStatus = data.organisationStatus;

    // --- OrganisationDetail Fields ---
    if (data.contactNumber !== undefined) orgDetailData.contactNumber = data.contactNumber;
    if (data.email !== undefined) orgDetailData.email = data.email;
    if (data.website !== undefined) orgDetailData.website = data.website;
    if (data.physicalStreet !== undefined) orgDetailData.physicalStreet = data.physicalStreet;
    if (data.physicalComplexName !== undefined) orgDetailData.physicalComplexName = data.physicalComplexName;
    if (data.physicalComplexNumber !== undefined) orgDetailData.physicalComplexNumber = data.physicalComplexNumber;
    if (data.physicalCity !== undefined) orgDetailData.physicalCity = data.physicalCity;
    if (data.physicalPostalCode !== undefined) orgDetailData.physicalPostalCode = data.physicalPostalCode;
    if (data.physicalProvince !== undefined) orgDetailData.physicalProvince = data.physicalProvince;
    if (data.physicalDistrict !== undefined) orgDetailData.physicalDistrict = data.physicalDistrict;

    if (data.useDifferentPostalAddress !== undefined) orgDetailData.useDifferentPostalAddress = data.useDifferentPostalAddress;
    if (data.useDifferentPostalAddress === false) {
      if (data.physicalStreet !== undefined) orgDetailData.postalStreet = data.physicalStreet;
      if (data.physicalComplexName !== undefined) orgDetailData.postalComplexName = data.physicalComplexName;
      if (data.physicalComplexNumber !== undefined) orgDetailData.postalComplexNumber = data.physicalComplexNumber;
      if (data.physicalCity !== undefined) orgDetailData.postalCity = data.physicalCity;
      if (data.physicalProvince !== undefined) orgDetailData.postalProvince = data.physicalProvince;
      if (data.physicalDistrict !== undefined) orgDetailData.postalDistrict = data.physicalDistrict;
      if (data.physicalPostalCode !== undefined) orgDetailData.postalCode = data.physicalPostalCode;
    } else {
      if (data.postalStreet !== undefined) orgDetailData.postalStreet = data.postalStreet;
      if (data.postalComplexName !== undefined) orgDetailData.postalComplexName = data.postalComplexName;
      if (data.postalComplexNumber !== undefined) orgDetailData.postalComplexNumber = data.postalComplexNumber;
      if (data.postalCity !== undefined) orgDetailData.postalCity = data.postalCity;
      if (data.postalProvince !== undefined) orgDetailData.postalProvince = data.postalProvince;
      if (data.postalDistrict !== undefined) orgDetailData.postalDistrict = data.postalDistrict;
    }
    if (data.latitude !== undefined) orgDetailData.latitude = data.latitude;
    if (data.longitude !== undefined) orgDetailData.longitude = data.longitude;
    if (data.mapAddress !== undefined) orgDetailData.mapAddress = data.mapAddress;

    // If there is data to update for OrganisationDetail, add it to the main payload
    if (Object.keys(orgDetailData).length > 0) {
      ldaData.organisationDetail = {
        update: orgDetailData,
      };
    }

    // --- Relational Fields ---
    if (Array.isArray(data.focusAreas)) {
      ldaData.focusAreas = {
        set: [],
        connect: data.focusAreas.map((id: number) => ({ id })),
      };
    }
    if (Array.isArray(data.funds)) {
      ldaData.funds = {
        set: [],
        connect: data.funds.map((id: number) => ({ id })),
      };
    }

    const updated = await prisma.localDevelopmentAgency.update({
      where: { id: ldaId },
      data: ldaData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update LDA:", err);
    return NextResponse.json({ error: "Failed to update", detail: (err as Error).message }, { status: 500 });
  }
}
