import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { generatePeriodSchedules } from "@/lib/report-schedule"
import { ReportFrequency } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const applicationTemplateId = searchParams.get("applicationTemplateId")

  const where = applicationTemplateId
    ? { applicationTemplateId: parseInt(applicationTemplateId) }
    : {}

  const configs = await prisma.reportScheduleConfig.findMany({
    where,
    include: {
      applicationTemplate: {
        select: { id: true, name: true }
      },
      reportTemplate: {
        select: { id: true, name: true }
      },
      periodSchedules: {
        orderBy: [{ year: "asc" }, { period: "asc" }]
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return NextResponse.json(configs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  if (!permissions.isSuperUser(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  try {
    const data = await req.json()

    const {
      applicationTemplateId,
      reportTemplateId,
      frequency,
      availableDaysBefore = 14,
      dueDaysAfterPeriodEnd = 0,
      generateForYear
    } = data

    // Validate required fields
    if (!applicationTemplateId || !reportTemplateId || !frequency) {
      return NextResponse.json(
        { error: "applicationTemplateId, reportTemplateId, and frequency are required" },
        { status: 400 }
      )
    }

    // Validate templates exist
    const [appTemplate, reportTemplate] = await Promise.all([
      prisma.formTemplate.findUnique({ where: { id: applicationTemplateId } }),
      prisma.formTemplate.findUnique({ where: { id: reportTemplateId } })
    ])

    if (!appTemplate) {
      return NextResponse.json({ error: "Application template not found" }, { status: 404 })
    }

    if (!reportTemplate) {
      return NextResponse.json({ error: "Report template not found" }, { status: 404 })
    }

    if (appTemplate.templateType !== "APPLICATION") {
      return NextResponse.json(
        { error: "applicationTemplateId must reference an APPLICATION type template" },
        { status: 400 }
      )
    }

    if (reportTemplate.templateType !== "REPORT") {
      return NextResponse.json(
        { error: "reportTemplateId must reference a REPORT type template" },
        { status: 400 }
      )
    }

    // Create the config
    const config = await prisma.reportScheduleConfig.create({
      data: {
        applicationTemplateId,
        reportTemplateId,
        frequency: frequency as ReportFrequency,
        availableDaysBefore,
        dueDaysAfterPeriodEnd,
        active: true
      }
    })

    // Generate period schedules for the specified year (or current year)
    const year = generateForYear || new Date().getFullYear()
    const schedules = generatePeriodSchedules(year, {
      frequency: frequency as ReportFrequency,
      availableDaysBefore,
      dueDaysAfterPeriodEnd
    })

    // Create period schedules
    await prisma.reportPeriodSchedule.createMany({
      data: schedules.map(schedule => ({
        reportConfigId: config.id,
        year: schedule.year,
        period: schedule.period,
        periodStart: schedule.periodStart,
        periodEnd: schedule.periodEnd,
        availableDate: schedule.availableDate,
        dueDate: schedule.dueDate,
        isCustomized: false
      }))
    })

    // Fetch the complete config with schedules
    const completeConfig = await prisma.reportScheduleConfig.findUnique({
      where: { id: config.id },
      include: {
        applicationTemplate: { select: { id: true, name: true } },
        reportTemplate: { select: { id: true, name: true } },
        periodSchedules: { orderBy: [{ year: "asc" }, { period: "asc" }] }
      }
    })

    return NextResponse.json(completeConfig, { status: 201 })
  } catch (error) {
    console.error("Failed to create report schedule config:", error)
    
    // Handle unique constraint violation
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "A config with this application template, report template, and frequency already exists" },
        { status: 409 }
      )
    }
    
    return NextResponse.json({ error: "Failed to create config" }, { status: 500 })
  }
}
