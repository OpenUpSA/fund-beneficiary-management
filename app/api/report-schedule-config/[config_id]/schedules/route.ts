import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { generatePeriodSchedules } from "@/lib/report-schedule"
import { ReportFrequency } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Update a specific period schedule (for customizing dates)
export async function PUT(
  req: NextRequest,
  { params }: { params: { config_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  if (!permissions.isSuperUser(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const configId = parseInt(params.config_id, 10)

  try {
    const data = await req.json()
    const { scheduleId, availableDate, dueDate, note } = data

    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 })
    }

    // Verify the schedule belongs to this config
    const schedule = await prisma.reportPeriodSchedule.findUnique({
      where: { id: scheduleId }
    })

    if (!schedule || schedule.reportConfigId !== configId) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const updated = await prisma.reportPeriodSchedule.update({
      where: { id: scheduleId },
      data: {
        availableDate: availableDate ? new Date(availableDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        note: note,
        isCustomized: true
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update period schedule:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

// Generate schedules for a new year
export async function POST(
  req: NextRequest,
  { params }: { params: { config_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  if (!permissions.isSuperUser(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const configId = parseInt(params.config_id, 10)

  try {
    const data = await req.json()
    const { year } = data

    if (!year) {
      return NextResponse.json({ error: "year is required" }, { status: 400 })
    }

    // Get the config
    const config = await prisma.reportScheduleConfig.findUnique({
      where: { id: configId }
    })

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    // Check if schedules already exist for this year
    const existing = await prisma.reportPeriodSchedule.findFirst({
      where: {
        reportConfigId: configId,
        year: year
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: `Schedules for year ${year} already exist` },
        { status: 409 }
      )
    }

    // Generate schedules
    const schedules = generatePeriodSchedules(year, {
      frequency: config.frequency as ReportFrequency,
      availableDaysBefore: config.availableDaysBefore,
      dueDaysAfterPeriodEnd: config.dueDaysAfterPeriodEnd
    })

    // Create period schedules
    await prisma.reportPeriodSchedule.createMany({
      data: schedules.map(schedule => ({
        reportConfigId: configId,
        year: schedule.year,
        period: schedule.period,
        periodStart: schedule.periodStart,
        periodEnd: schedule.periodEnd,
        availableDate: schedule.availableDate,
        dueDate: schedule.dueDate,
        isCustomized: false
      }))
    })

    // Fetch the created schedules
    const createdSchedules = await prisma.reportPeriodSchedule.findMany({
      where: {
        reportConfigId: configId,
        year: year
      },
      orderBy: { period: "asc" }
    })

    return NextResponse.json(createdSchedules, { status: 201 })
  } catch (error) {
    console.error("Failed to generate schedules:", error)
    return NextResponse.json({ error: "Failed to generate schedules" }, { status: 500 })
  }
}
