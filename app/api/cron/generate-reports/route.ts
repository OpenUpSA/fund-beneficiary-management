import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Vercel Cron jobs use GET requests
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (in production)
  const authHeader = req.headers.get("authorization")
  if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const results = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // Get all active report schedule configs with their schedules
    const configs = await prisma.reportScheduleConfig.findMany({
      where: { active: true },
      include: {
        applicationTemplate: true,
        reportTemplate: true,
        periodSchedules: {
          where: {
            availableDate: { lte: today },
          },
          orderBy: [{ year: "asc" }, { period: "asc" }],
        },
      },
    })

    // Get the Draft status for new reports
    const draftStatus = await prisma.formStatus.findFirst({
      where: { label: "Draft" },
    })

    if (!draftStatus) {
      return NextResponse.json(
        { error: "Draft status not found in database" },
        { status: 500 }
      )
    }

    // Get the Approved status to find approved applications
    const approvedStatus = await prisma.formStatus.findFirst({
      where: { label: "Approved" },
    })

    if (!approvedStatus) {
      return NextResponse.json(
        { error: "Approved status not found in database" },
        { status: 500 }
      )
    }

    for (const config of configs) {
      // Find all approved applications using this application template
      const approvedApplications = await prisma.localDevelopmentAgencyForm.findMany({
        where: {
          formTemplateId: config.applicationTemplateId,
          formStatusId: approvedStatus.id,
        },
        include: {
          localDevelopmentAgency: true,
        },
      })

      for (const application of approvedApplications) {
        for (const schedule of config.periodSchedules) {
          results.processed++

          // Check dates
          const fundingEnd = new Date(application.fundingEnd)
          const periodStart = new Date(schedule.periodStart)
          const periodEnd = new Date(schedule.periodEnd)

          // Skip if application funding has already ended (fundingEnd is in the past)
          if (fundingEnd < today) {
            results.skipped++
            continue
          }

          // Skip if report period end date is already in the past
          if (periodEnd < today) {
            results.skipped++
            continue
          }

          // Only create report if period start date is today or in the past
          if (periodStart > today) {
            results.skipped++
            continue
          }

          // Check if a report already exists for this application, template, and period
          // We use a combination of linkedFormId, formTemplateId, and date range to identify
          const existingReport = await prisma.localDevelopmentAgencyForm.findFirst({
            where: {
              linkedFormId: application.id,
              formTemplateId: config.reportTemplateId,
              fundingStart: schedule.periodStart,
              fundingEnd: schedule.periodEnd,
            },
          })

          if (existingReport) {
            results.skipped++
            continue
          }

          try {
            // Create the report
            const periodLabel = getPeriodLabel(config.frequency, schedule.period)
            
            await prisma.localDevelopmentAgencyForm.create({
              data: {
                localDevelopmentAgencyId: application.localDevelopmentAgencyId,
                formTemplateId: config.reportTemplateId,
                formStatusId: draftStatus.id,
                formData: {},
                title: `${config.reportTemplate.name} - ${periodLabel} ${schedule.year}`,
                linkedFormId: application.id,
                dueDate: schedule.dueDate,
                fundingStart: schedule.periodStart,
                fundingEnd: schedule.periodEnd,
              },
            })

            results.created++
          } catch (error) {
            const errorMsg = `Failed to create report for LDA ${application.localDevelopmentAgencyId}, period ${schedule.period}/${schedule.year}: ${error}`
            console.error(errorMsg)
            results.errors.push(errorMsg)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error("Cron job failed:", error)
    return NextResponse.json(
      { error: "Cron job failed", details: String(error) },
      { status: 500 }
    )
  }
}

function getPeriodLabel(frequency: string, period: number): string {
  switch (frequency) {
    case "MONTHLY":
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return months[period - 1] || `Month ${period}`
    case "QUARTERLY":
      return `Q${period}`
    case "BIANNUALLY":
      return period === 1 ? "H1" : "H2"
    case "ANNUALLY":
      return "Annual"
    default:
      return `Period ${period}`
  }
}
