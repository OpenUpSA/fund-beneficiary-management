import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canManageFund } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { fund_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can see funds and funders
  if (!canManageFund(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const fundId = parseInt(params.fund_id, 10)

  const record = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      focusAreas: true,
      organisationDetail: true,
      fundFunders: {
        include: {
          funder: {
            include: {
              focusAreas: true,
              organisationDetail: true
            }
          }
        }
      },
      fundLocalDevelopmentAgencies: {
        include: {
          localDevelopmentAgency: true,
          fund: {
            select: {
              name: true,
              id: true
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
}

export async function PUT(req: NextRequest, { params }: { params: { fund_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can update funds
  if (!canManageFund(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const fundId = parseInt(params.fund_id, 10)

  try {
    const data = await req.json();

    // Get existing fund to access organisationDetailId
    const existingFund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { organisationDetailId: true }
    });

    if (!existingFund) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }

    // Update organisation detail
    await prisma.organisationDetail.update({
      where: { id: existingFund.organisationDetailId },
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

    // Get current focus areas to disconnect
    const currentFund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: { focusAreas: true }
    });

    // Update the fund
    const updatedFund = await prisma.fund.update({
      where: { id: fundId },
      data: {
        name: data.name,
        about: data.about,
        fundingStatus: data.fundingStatus,
        fundType: data.fundType,
        amount: data.amount,
        defaultAmount: data.defaultAmount || null,
        fundingCalculationType: data.fundingCalculationType,
        fundingStart: new Date(data.fundingStart),
        fundingEnd: new Date(data.fundingEnd),
        focusAreas: {
          disconnect: currentFund?.focusAreas.map((fa) => ({ id: fa.id })) || [],
          connect: data.focusAreas.map((id: number) => ({ id })),
        },
      },
      include: {
        focusAreas: true,
        organisationDetail: true,
      },
    });

    return NextResponse.json(updatedFund);
  } catch (error) {
    console.error("Error updating fund:", error);
    return NextResponse.json(
      { error: "Failed to update fund", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
