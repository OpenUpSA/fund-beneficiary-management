import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunders, canManageFunder } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can see funders
  if (!canViewFunders(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const records = await prisma.funder.findMany({
    include: {
      focusAreas: true
    },
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Permission check: Only Superuser can create funders
    if (!canManageFunder(user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const data = await req.json()

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

    // Create the funder
    const funder = await prisma.funder.create({
      data: {
        name: data.name,
        about: data.about,
        amount: data.amount,
        fundingStatus: data.fundingStatus || 'Active',
        fundingStart: new Date(data.fundingStart),
        fundingEnd: new Date(data.fundingEnd),
        organisationDetailId: organisationDetail.id,
        focusAreas: {
          connect: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
      },
      include: {
        focusAreas: true,
        organisationDetail: true,
      },
    });

    return NextResponse.json(funder, { status: 201 })
  } catch (error: unknown) {
    console.error("Failed to create funder:", error);
    
    // Handle Prisma unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const target = 'meta' in error && error.meta && typeof error.meta === 'object' && 'target' in error.meta ? error.meta.target : null;
      if (target && Array.isArray(target) && target.includes('name')) {
        return NextResponse.json(
          { error: "A funder with this name already exists. Please use a different name." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "This funder already exists with the provided details." },
        { status: 409 }
      );
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : "Failed to create funder";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}