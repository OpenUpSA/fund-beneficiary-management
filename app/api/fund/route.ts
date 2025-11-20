import { NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canManageFund } from "@/lib/permissions"
// import { permissions, canViewFunds } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url)
  const ldaIdParam = searchParams.get('ldaId')
  const ldaId = ldaIdParam ? parseInt(ldaIdParam) : undefined

  // Check if user can view funds
  // if (!canViewFunds(user)) {
  //   return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  // }
  // Return funds for authorized users, optionally filtered by LDA
  const records = await prisma.fund.findMany({
    where: ldaId ? {
      fundLocalDevelopmentAgencies: {
        some: {
          localDevelopmentAgencyId: ldaId
        }
      }
    } : undefined,
    include: {
      focusAreas: true,
      organisationDetail: true,
      fundFunders: {
        select: {
          id: true,
        }
      },
      fundLocalDevelopmentAgencies: {
        select: {
          id: true,
          fundingStatus: true
        }
      }
    },
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can create funds
  if (!canManageFund(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  try {
    const data = await request.json();

    // Create organisation detail first
    const organisationDetail = await prisma.organisationDetail.create({
      data: {
        contactNumber: data.contactNumber || "",
        email: data.email || "",
        website: data.website || "",
        physicalStreet: data.physicalStreet || "",
        physicalComplexName: data.physicalComplexName || "",
        physicalComplexNumber: data.physicalComplexNumber || "",
        physicalCity: data.physicalCity || "",
        physicalPostalCode: data.physicalPostalCode || "",
        physicalProvince: data.physicalProvince || "",
        physicalDistrict: data.physicalDistrict || "",
        useDifferentPostalAddress: data.useDifferentPostalAddress || false,
        postalStreet: data.postalStreet || "",
        postalComplexName: data.postalComplexName || "",
        postalComplexNumber: data.postalComplexNumber || "",
        postalCity: data.postalCity || "",
        postalCode: data.postalCode || "",
        postalProvince: data.postalProvince || "",
        postalDistrict: data.postalDistrict || "",
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        mapAddress: data.mapAddress || "",
      },
    });

    // Create the fund
    const fund = await prisma.fund.create({
      data: {
        name: data.name,
        about: data.about,
        fundingStatus: data.fundingStatus,
        fundType: data.fundType,
        amount: data.amount,
        fundingCalculationType: data.fundingCalculationType || "total_funded_amount",
        fundingStart: new Date(data.fundingStart),
        fundingEnd: new Date(data.fundingEnd),
        organisationDetailId: organisationDetail.id,
        focusAreas: {
          connect: data.focusAreas.map((id: number) => ({ id })),
        },
      },
      include: {
        focusAreas: true,
        organisationDetail: true,
      },
    });

    return NextResponse.json(fund, { status: 201 });
  } catch (error) {
    console.error("Error creating fund:", error);
    return NextResponse.json(
      { error: "Failed to create fund", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
