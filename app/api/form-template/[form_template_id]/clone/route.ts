import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { revalidateTag } from "next/cache"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { form_template_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS)
    const user = session?.user || null

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (!permissions.isSuperUser(user)) {
      return NextResponse.json(
        { error: "Permission denied - only superuser can clone form templates" },
        { status: 403 }
      )
    }

    const templateId = parseInt(params.form_template_id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
    }

    const { name } = await req.json()
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name is required and must be at least 2 characters" },
        { status: 400 }
      )
    }

    // Check if name already exists
    const existingTemplate = await prisma.formTemplate.findUnique({
      where: { name: name.trim() },
    })
    if (existingTemplate) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 400 }
      )
    }

    // Get the source template
    const sourceTemplate = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      include: {
        reportConfigs: {
          include: {
            periodSchedules: true,
          },
        },
      },
    })

    if (!sourceTemplate) {
      return NextResponse.json({ error: "Source template not found" }, { status: 404 })
    }

    // Create the cloned template
    const clonedTemplate = await prisma.formTemplate.create({
      data: {
        name: name.trim(),
        description: sourceTemplate.description,
        form: sourceTemplate.form as object,
        active: true,
        templateType: sourceTemplate.templateType,
        linkedFormTemplateId: sourceTemplate.linkedFormTemplateId,
        sidebarConfig: sourceTemplate.sidebarConfig as object,
      },
    })

    // Clone report schedule configs if this is an APPLICATION template
    if (sourceTemplate.templateType === "APPLICATION" && sourceTemplate.reportConfigs.length > 0) {
      for (const config of sourceTemplate.reportConfigs) {
        const clonedConfig = await prisma.reportScheduleConfig.create({
          data: {
            applicationTemplateId: clonedTemplate.id,
            reportTemplateId: config.reportTemplateId,
            frequency: config.frequency,
            availableDaysBefore: config.availableDaysBefore,
            dueDaysAfterPeriodEnd: config.dueDaysAfterPeriodEnd,
            active: config.active,
          },
        })

        // Clone period schedules
        if (config.periodSchedules.length > 0) {
          await prisma.reportPeriodSchedule.createMany({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: config.periodSchedules.map((schedule: any) => ({
              reportConfigId: clonedConfig.id,
              year: schedule.year,
              period: schedule.period,
              periodStart: schedule.periodStart,
              periodEnd: schedule.periodEnd,
              availableDate: schedule.availableDate,
              dueDate: schedule.dueDate,
              isCustomized: schedule.isCustomized,
              note: schedule.note,
            })),
          })
        }
      }
    }

    revalidateTag("templates")

    return NextResponse.json({
      success: true,
      template: clonedTemplate,
    })
  } catch (error) {
    console.error("Failed to clone form template:", error)
    return NextResponse.json({ error: "Failed to clone template" }, { status: 500 })
  }
}
