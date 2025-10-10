import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can see funders
  if (!permissions.isSuperUser(user) && !permissions.isAdmin(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const records = await prisma.funder.findMany({
    include: {
      fundingStatus: true,
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
    if (!permissions.isSuperUser(user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

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
        locations: {
          connect: data.locations.map((locationId: number) => ({ id: locationId })),
        },
        focusAreas: {
          connect: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
        organisationDetail: { create: {} }
      },
    }
    const record = await prisma.funder.create(query)

    return NextResponse.json(record)
  } catch (error) {
    console.error("Failed to create funder:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}