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
    // Fetch configs, draftStatus, and approvedStatus in parallel
    const [configs, draftStatus, approvedStatus] = await Promise.all([
      prisma.reportScheduleConfig.findMany({
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
      }),
      prisma.formStatus.findFirst({ where: { label: "Draft" } }),
      prisma.formStatus.findFirst({ where: { label: "Approved" } }),
    ])

    if (!draftStatus) {
      return NextResponse.json(
        { error: "Draft status not found in database" },
        { status: 500 }
      )
    }

    if (!approvedStatus) {
      return NextResponse.json(
        { error: "Approved status not found in database" },
        { status: 500 }
      )
    }

    // Collect all unique application template IDs across all configs
    const applicationTemplateIds = [...new Set(configs.map(c => c.applicationTemplateId))]

    // Fetch ALL approved applications across all configs in one query
    const allApprovedApplications = applicationTemplateIds.length > 0
      ? await prisma.localDevelopmentAgencyForm.findMany({
          where: {
            formTemplateId: { in: applicationTemplateIds },
            formStatusId: approvedStatus.id,
          },
          include: { localDevelopmentAgency: true },
        })
      : []

    // Group applications by templateId for efficient lookup
    const applicationsByTemplateId = new Map<number, typeof allApprovedApplications>()
    for (const app of allApprovedApplications) {
      const group = applicationsByTemplateId.get(app.formTemplateId) ?? []
      group.push(app)
      applicationsByTemplateId.set(app.formTemplateId, group)
    }

    // Fetch ALL existing reports for these applications in one query
    const allApplicationIds = allApprovedApplications.map(a => a.id)
    const allExistingReports = allApplicationIds.length > 0
      ? await prisma.localDevelopmentAgencyForm.findMany({
          where: { linkedFormId: { in: allApplicationIds } },
          select: { linkedFormId: true, formTemplateId: true, fundingStart: true, fundingEnd: true },
        })
      : []

    // Build a Set for O(1) duplicate checking: "linkedFormId-templateId-start-end"
    const existingReportKeys = new Set(
      allExistingReports.map(r =>
        `${r.linkedFormId}-${r.formTemplateId}-${r.fundingStart?.toISOString()}-${r.fundingEnd?.toISOString()}`
      )
    )

    // Determine which reports need to be created (pure in-memory, no DB calls)
    type CreateData = Parameters<typeof prisma.localDevelopmentAgencyForm.create>[0]['data']
    const reportsToCreate: { data: CreateData; ldaId: number; period: number; year: number }[] = []

    for (const config of configs) {
      const approvedApplications = applicationsByTemplateId.get(config.applicationTemplateId) ?? []

      for (const application of approvedApplications) {
        for (const schedule of config.periodSchedules) {
          results.processed++

          const fundingEnd = new Date(application.fundingEnd)
          const periodStart = new Date(schedule.periodStart)
          const periodEnd = new Date(schedule.periodEnd)

          // Skip if application funding has already ended
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

          // Check in-memory Set instead of querying DB
          const key = `${application.id}-${config.reportTemplateId}-${periodStart.toISOString()}-${periodEnd.toISOString()}`
          if (existingReportKeys.has(key)) {
            results.skipped++
            continue
          }

          const periodLabel = getPeriodLabel(config.frequency, schedule.period)
          reportsToCreate.push({
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
            ldaId: application.localDevelopmentAgencyId,
            period: schedule.period,
            year: schedule.year,
          })
        }
      }
    }

    // Create all reports in parallel
    await Promise.all(reportsToCreate.map(async ({ data, ldaId, period, year }) => {
      try {
        await prisma.localDevelopmentAgencyForm.create({ data })
        results.created++
      } catch (error) {
        const errorMsg = `Failed to create report for LDA ${ldaId}, period ${period}/${year}: ${error}`
        console.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }))

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
