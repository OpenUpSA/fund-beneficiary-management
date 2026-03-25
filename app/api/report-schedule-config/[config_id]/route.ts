import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { config_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const configId = parseInt(params.config_id, 10)

  const config = await prisma.reportScheduleConfig.findUnique({
    where: { id: configId },
    include: {
      applicationTemplate: { select: { id: true, name: true } },
      reportTemplate: { select: { id: true, name: true } },
      periodSchedules: { orderBy: [{ year: "asc" }, { period: "asc" }] }
    }
  })

  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 })
  }

  return NextResponse.json(config)
}

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

    const existingConfig = await prisma.reportScheduleConfig.findUnique({
      where: { id: configId }
    })

    if (!existingConfig) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    const updated = await prisma.reportScheduleConfig.update({
      where: { id: configId },
      data: {
        frequency: data.frequency,
        availableDaysBefore: data.availableDaysBefore,
        dueDaysAfterPeriodEnd: data.dueDaysAfterPeriodEnd,
        active: data.active
      },
      include: {
        applicationTemplate: { select: { id: true, name: true } },
        reportTemplate: { select: { id: true, name: true } },
        periodSchedules: { orderBy: [{ year: "asc" }, { period: "asc" }] }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update report schedule config:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(
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
    const existingConfig = await prisma.reportScheduleConfig.findUnique({
      where: { id: configId }
    })

    if (!existingConfig) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    await prisma.reportScheduleConfig.delete({
      where: { id: configId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete report schedule config:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
