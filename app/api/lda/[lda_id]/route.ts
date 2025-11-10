import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { Prisma } from "@prisma/client";
import { permissions } from "@/lib/permissions"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_id: string } }) {
  const ldaId = parseInt(params.lda_id, 10)

  if (Number.isNaN(ldaId)) {
    return NextResponse.json({ error: "Invalid LDA id" }, { status: 400 })
  }

  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null

  const canViewLDA = permissions.canViewLDA(user, ldaId)

  if (!canViewLDA) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  try {
    const record = await prisma.localDevelopmentAgency.findUnique({
      where: { id: ldaId },
      include: {
        fundingStatus: true,
        focusAreas: true,
        location: true,
        programmeOfficer: true,
        developmentStage: true,
        organisationDetail: true,
        operations: true,
        userAccess: true,
        staffMembers: true,
        fundLocalDevelopmentAgencies: {
          include: {
            fund: {
              include: {
                focusAreas: true,
                fundFunders: {
                  include: {
                    funder: true
                  }
                }
              }
            }
          }
        }
      },
    })

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    return NextResponse.json(record)
  } catch (err) {
    console.error("Failed to fetch LDA:", err)
    return NextResponse.json({ error: "Failed to fetch LDA", detail: (err as Error).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { lda_id: string } }) {
  try {
    const ldaId = parseInt(params.lda_id, 10);
    if (Number.isNaN(ldaId)) {
      return NextResponse.json({ error: "Invalid LDA id" }, { status: 400 });
    }

    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null
    const canUpdateLDA = permissions.canManageLDA(user, ldaId)

    if (!canUpdateLDA) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

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
    if (data.registrationDate !== undefined) {
      // Validate that we have a valid date string before converting
      const dateValue = new Date(data.registrationDate);
      if (!isNaN(dateValue.getTime())) {
        ldaData.registrationDate = dateValue;
      } else {
        // If invalid date, set to null (since the field is optional in the schema)
        ldaData.registrationDate = null;
      }
    }
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

export async function DELETE(req: NextRequest, { params }: { params: { lda_id: string } }) {
  const ldaId = parseInt(params.lda_id, 10)

  if (Number.isNaN(ldaId)) {
    return NextResponse.json({ error: "Invalid LDA id" }, { status: 400 })
  }

  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null

  // Only SuperUsers can delete LDAs
  if (!user || !permissions.canDeleteLDA(user)) {
    return NextResponse.json({ error: "Permission denied. Only SuperUsers can delete LDAs." }, { status: 403 })
  }

  try {
    // Check if LDA exists and get all related data for cleanup
    const existingLDA = await prisma.localDevelopmentAgency.findUnique({
      where: { id: ldaId },
      select: { 
        id: true, 
        name: true,
        media: { select: { id: true, filePath: true } },
        documents: { select: { id: true, filePath: true } }
      }
    })

    if (!existingLDA) {
      return NextResponse.json({ error: "LDA not found" }, { status: 404 })
    }

    // Use transaction to ensure all deletions succeed or fail together
    await prisma.$transaction(async (tx) => {
      // 1. Delete many-to-many relations first
      await tx.localDevelopmentAgency.update({
        where: { id: ldaId },
        data: {
          focusAreas: { set: [] },
          contacts: { set: [] }
        }
      })

      // 2. Delete related records with foreign keys
      await tx.localDevelopmentAgencyForm.deleteMany({
        where: { localDevelopmentAgencyId: ldaId }
      })

      await tx.organisationOperations.deleteMany({
        where: { localDevelopmentAgencyId: ldaId }
      })

      await tx.staffMember.deleteMany({
        where: { localDevelopmentAgencyId: ldaId }
      })

      await tx.userAccess.deleteMany({
        where: { localDevelopmentAgencyId: ldaId }
      })

      await tx.media.deleteMany({
        where: { localDevelopmentAgencyId: ldaId }
      })

      await tx.document.deleteMany({
        where: { localDevelopmentAgencyId: ldaId }
      })

      // 3. Finally delete the LDA itself
      await tx.localDevelopmentAgency.delete({
        where: { id: ldaId }
      })
    })

    return NextResponse.json({ 
      message: `LDA "${existingLDA.name}" and all related data have been successfully deleted`,
      deletedId: ldaId,
      deletedFiles: {
        media: existingLDA.media.length,
        documents: existingLDA.documents.length
      }
    });
  } catch (err) {
    console.error("Failed to delete LDA:", err);
    
    // Handle foreign key constraint errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2003') {
        return NextResponse.json({ 
          error: "Cannot delete LDA due to existing references. Please remove all associated data first." 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: "Failed to delete LDA", 
      detail: (err as Error).message 
    }, { status: 500 });
  }
}
