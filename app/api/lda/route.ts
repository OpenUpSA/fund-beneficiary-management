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
          funders: true
        }
      },
      organisationDetail: {
        select: {
          physicalProvince: true,
          latitude: true,
          longitude: true,
          physicalStreet: true,
          physicalComplexName: true,
          physicalComplexNumber: true,
          physicalCity: true,
          physicalPostalCode: true,
          physicalDistrict: true,
        },
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
        programmeOfficer: {
          connect: { id: parseInt(data.programmeOfficerId) }
        },
        developmentStage: {
          connect: { id: parseInt(data.developmentStageId) }
        },
        totalFundingRounds: data.totalFundingRounds,
        focusAreas: data.focusAreas && data.focusAreas.length > 0 ? {
          connect: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        } : undefined,
        registrationStatus: data.registrationStatus,
        registrationCode: data.registrationCode,
        registrationDate: data.registrationDate,
        organisationStatus: data.organisationStatus,
        organisationDetail: {
          create: {
            contactNumber: data.contactNumber || '',
            email: data.email || '',
            website: data.website || '',
            physicalStreet: data.physicalStreet || '',
            physicalComplexName: data.physicalComplexName || '',
            physicalComplexNumber: data.physicalComplexNumber || '',
            physicalCity: data.physicalCity || '',
            physicalPostalCode: data.physicalPostalCode || '',
            physicalProvince: data.physicalProvince || '',
            physicalDistrict: data.physicalDistrict || '',
            useDifferentPostalAddress: data.useDifferentPostalAddress || false,
            postalStreet: data.useDifferentPostalAddress ? data.postalStreet : data.physicalStreet || '',
            postalComplexName: data.useDifferentPostalAddress ? data.postalComplexName : data.physicalComplexName || '',
            postalComplexNumber: data.useDifferentPostalAddress ? data.postalComplexNumber : data.physicalComplexNumber || '',
            postalCity: data.useDifferentPostalAddress ? data.postalCity : data.physicalCity || '',
            postalProvince: data.useDifferentPostalAddress ? data.postalProvince : data.physicalProvince || '',
            postalDistrict: data.useDifferentPostalAddress ? data.postalDistrict : data.physicalDistrict || '',
            postalCode: data.useDifferentPostalAddress ? data.postalCode : data.physicalPostalCode || '',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            mapAddress: data.mapAddress || '',
          }
        },
        operations: { create: {} },
      },
    }
    const record = await prisma.localDevelopmentAgency.create(query)

    return NextResponse.json(record)
  } catch (error) {
    console.error("Failed to create LDA:", error);
    return NextResponse.json({ error: "Failed to create", detail: (error as Error).message }, { status: 500 });
  }
}