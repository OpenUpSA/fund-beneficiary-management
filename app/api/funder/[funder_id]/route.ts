import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunders, canManageFunder } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { funder_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can see funders
  if (!canViewFunders(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const id = parseInt(params.funder_id, 10)

  const record = await prisma.funder.findUnique({
    where: { id: id },
    include: {
      focusAreas: true,
      organisationDetail: true,
      fundFunders: {
        include: {
          fund: {
            include: {
              focusAreas: true
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

export async function PUT(req: NextRequest, { params }: { params: { funder_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Superuser can edit funders
  if (!canManageFunder(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const id = parseInt(params.funder_id, 10)

  try {
    const data = await req.json()

    // Get existing funder to access organisationDetailId
    const existingFunder = await prisma.funder.findUnique({
      where: { id: id },
      select: { organisationDetailId: true }
    });

    if (!existingFunder) {
      return NextResponse.json({ error: "Funder not found" }, { status: 404 });
    }

    // Update organisation detail
    await prisma.organisationDetail.update({
      where: { id: existingFunder.organisationDetailId },
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

    // Update the funder
    const updated = await prisma.funder.update({
      where: { id: id },
      data: {
        name: data.name,
        about: data.about,
        amount: data.amount,
        fundingStatus: data.fundingStatus,
        fundingStart: new Date(data.fundingStart),
        fundingEnd: new Date(data.fundingEnd),
        focusAreas: {
          set: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
      },
      include: {
        focusAreas: true,
        organisationDetail: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update funder:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
