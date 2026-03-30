import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/provinces
 * Returns all provinces with their districts
 */
export async function GET() {
  try {
    const provinces = await prisma.province.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(provinces)
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provinces' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  try {
    const data = await req.json()
    const record = await prisma.province.create({
      data: {
        name: data.name,
        code: data.code,
        districts: data.districts || [],
      }
    })
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error creating province:', error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
