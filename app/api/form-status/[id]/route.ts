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
  const record = await prisma.formStatus.findUnique({
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
    const record = await prisma.formStatus.update({
      where: { id },
      data: {
        label: data.label,
        icon: data.icon || 'circle',
      }
    })
    revalidateTag('form-statuses')
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating form status:', error)
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
    // Check if any forms are using this status
    const usageCount = await prisma.localDevelopmentAgencyForm.count({
      where: { formStatusId: id }
    })
    
    if (usageCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete: ${usageCount} form(s) are using this status` 
      }, { status: 400 })
    }
    
    await prisma.formStatus.delete({
      where: { id }
    })
    revalidateTag('form-statuses')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting form status:', error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
