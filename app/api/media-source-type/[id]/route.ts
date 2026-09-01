import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { revalidateTag } from "next/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10)
  const record = await prisma.mediaSourceType.findUnique({
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
    if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const record = await prisma.mediaSourceType.update({
      where: { id },
      data: { title: data.title.trim() }
    })
    revalidateTag('media-source-types:list')
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating media source type:', error)
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
    const usageCount = await prisma.media.count({
      where: { mediaSourceTypeId: id }
    })

    if (usageCount > 0) {
      return NextResponse.json({
        error: `Cannot delete: ${usageCount} media item(s) are using this source type`
      }, { status: 400 })
    }

    await prisma.mediaSourceType.delete({
      where: { id }
    })
    revalidateTag('media-source-types:list')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting media source type:', error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
