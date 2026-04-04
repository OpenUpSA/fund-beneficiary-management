import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { revalidateTag } from "next/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.formStatus.findMany({
    orderBy: { label: 'asc' }
  })
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  try {
    const data = await req.json()
    const record = await prisma.formStatus.create({
      data: {
        label: data.label,
        icon: data.icon || 'circle',
      }
    })
    revalidateTag('form-statuses')
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error creating form status:', error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
