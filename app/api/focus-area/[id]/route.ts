import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10)
  const record = await prisma.focusArea.findUnique({
    where: { id }
  })
  
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  
  return NextResponse.json(record)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const id = parseInt(params.id, 10)
  
  try {
    const data = await req.json()
    const record = await prisma.focusArea.update({
      where: { id },
      data: {
        label: data.label,
        icon: data.icon || 'circle',
      }
    })
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating focus area:', error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const id = parseInt(params.id, 10)
  
  try {
    await prisma.focusArea.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting focus area:', error)
    return NextResponse.json({ error: "Failed to delete - may be in use" }, { status: 500 })
  }
}
