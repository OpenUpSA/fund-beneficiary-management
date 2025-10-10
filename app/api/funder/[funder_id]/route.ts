import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { funder_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can see funders
  if (!permissions.isSuperUser(user) && !permissions.isAdmin(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const id = parseInt(params.funder_id, 10)

  const record = await prisma.funder.findUnique({
    where: { id: id },
    include: {
      fundingStatus: true,
      locations: true,
      focusAreas: true,
      organisationDetail: true,
      contacts: true
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
  if (!permissions.isSuperUser(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const id = parseInt(params.funder_id, 10)

  try {
    const data = await req.json()

    const updated = await prisma.funder.update({
      where: { id: id },
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
          set: data.locations.map((locationId: number) => ({ id: locationId })),
        },
        focusAreas: {
          set: data.focusAreas.map((focusAreaId: number) => ({ id: focusAreaId })),
        },
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update funder:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
