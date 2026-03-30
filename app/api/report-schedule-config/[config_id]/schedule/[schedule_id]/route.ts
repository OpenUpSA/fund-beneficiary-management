import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function PUT(
  req: NextRequest,
  { params }: { params: { config_id: string; schedule_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const configId = parseInt(params.config_id, 10)
  const scheduleId = parseInt(params.schedule_id, 10)

  try {
    // Verify the schedule belongs to the config
    const schedule = await prisma.reportPeriodSchedule.findFirst({
      where: {
        id: scheduleId,
        reportConfigId: configId
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const data = await req.json()
    
    const updated = await prisma.reportPeriodSchedule.update({
      where: { id: scheduleId },
      data: {
        availableDate: data.availableDate ? new Date(data.availableDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        note: data.note,
        isCustomized: data.isCustomized ?? true
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating schedule:', error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
