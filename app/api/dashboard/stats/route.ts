import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { prisma } from "@/db"
import { permissions } from "@/lib/permissions"
import { REPORTING_INDICATORS } from "@/lib/reporting/indicators"

interface DashboardFilters {
  periodStart?: string
  periodEnd?: string
  provinceCodes?: string[]
  developmentStageIds?: number[]
  focusAreaIds?: number[]
  fundType?: string
  formStatusIds?: number[]
}

// A funder/LDA's location is the province code stored on its organisation detail
// (a slug like "eastern-cape"), which matches Province.code. The chart displays
// the province's two-letter shortCode (e.g. "EC").
type ProvinceRef = { code: string; name: string; shortCode: string }

// Build the conditions that keep funding records overlapping the selected period.
// A record overlaps the [start, end] window when it ends on/after the start and
// starts on/before the end. Returns {} when no period is selected so it can be
// spread into a Prisma `where` without effect.
function periodWhere(filters: DashboardFilters): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = []
  if (filters.periodStart) {
    conditions.push({ fundingEnd: { gte: new Date(filters.periodStart) } })
  }
  if (filters.periodEnd) {
    conditions.push({ fundingStart: { lte: new Date(filters.periodEnd) } })
  }
  return conditions.length ? { AND: conditions } : {}
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only ADMIN, PROGRAMME_OFFICER, SUPER_USER can access dashboard
  if (!permissions.isAdmin(session.user) && 
      !permissions.isProgrammeOfficer(session.user) && 
      !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  // Parse filters from query params
  const searchParams = req.nextUrl.searchParams
  const filters: DashboardFilters = {
    periodStart: searchParams.get("periodStart") || undefined,
    periodEnd: searchParams.get("periodEnd") || undefined,
    provinceCodes: searchParams.get("provinceCodes")?.split(",").filter(Boolean) || undefined,
    developmentStageIds: searchParams.get("developmentStageIds")?.split(",").map(Number).filter(Boolean) || undefined,
    focusAreaIds: searchParams.get("focusAreaIds")?.split(",").map(Number).filter(Boolean) || undefined,
    fundType: searchParams.get("fundType") || undefined,
    formStatusIds: searchParams.get("formStatusIds")?.split(",").map(Number).filter(Boolean) || undefined,
  }

  try {
    // Provinces drive both the location filter options and the per-province
    // chart buckets (all provinces are shown, in their stored order).
    const [provinces, developmentStages, focusAreas, formStatuses] = await Promise.all([
      prisma.province.findMany({ orderBy: { id: "asc" } }),
      prisma.developmentStage.findMany({ orderBy: { label: "asc" } }),
      prisma.focusArea.findMany({ orderBy: { label: "asc" } }),
      prisma.formStatus.findMany({ orderBy: { id: "asc" } }),
    ])

    const [ldaStats, funderStats, fundStats, reportingStats] = await Promise.all([
      getLDAStats(filters, provinces),
      getFunderStats(filters, provinces),
      getFundStats(filters),
      getReportingStats(filters),
    ])

    const filterOptions = {
      provinces: provinces.map(p => ({ id: p.code, label: p.name })),
      developmentStages: developmentStages.map(d => ({ id: d.id, label: d.label })),
      focusAreas: focusAreas.map(f => ({ id: f.id, label: f.label, icon: f.icon })),
      fundTypes: [
        { value: "CORE_FUND", label: "Core" },
        { value: "PROJECT_FUND", label: "Project" },
      ],
      formStatuses: formStatuses.map(s => ({ id: s.id, label: s.label })),
    }

    return NextResponse.json({
      lda: ldaStats,
      funder: funderStats,
      fund: fundStats,
      reporting: reportingStats,
      filterOptions,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}

// Build a zeroed bucket per province, in stored order, so every province
// always appears in the chart (including zero-count ones).
function emptyProvinceCounts(provinces: ProvinceRef[]) {
  const counts: Record<string, { label: string; short: string; count: number }> = {}
  for (const p of provinces) {
    counts[p.code] = { label: p.name, short: p.shortCode || p.code, count: 0 }
  }
  return counts
}

async function getLDAStats(filters: DashboardFilters, provinces: ProvinceRef[]) {
  // Build where clause for LDAs
  const ldaWhere: Record<string, unknown> = {
    organisationStatus: "active",
  }

  if (filters.provinceCodes?.length) {
    ldaWhere.organisationDetail = { physicalProvince: { in: filters.provinceCodes } }
  }
  if (filters.developmentStageIds?.length) {
    ldaWhere.developmentStageId = { in: filters.developmentStageIds }
  }
  if (filters.focusAreaIds?.length) {
    ldaWhere.focusAreas = { some: { id: { in: filters.focusAreaIds } } }
  }

  // Build where clause for funding relationships
  const fundingWhere: Record<string, unknown> = {
    fundingStatus: "Active",
    ...periodWhere(filters),
  }

  // Get active LDAs with their funding
  const ldas = await prisma.localDevelopmentAgency.findMany({
    where: ldaWhere,
    include: {
      organisationDetail: { select: { physicalProvince: true } },
      developmentStage: true,
      focusAreas: true,
      fundLocalDevelopmentAgencies: {
        where: fundingWhere,
        include: {
          fund: true,
        },
      },
    },
  })

  // Calculate total funded amount
  let totalFunded = 0
  for (const lda of ldas) {
    for (const funding of lda.fundLocalDevelopmentAgencies) {
      if (funding.amountType === "AD_HOC" && funding.amount) {
        totalFunded += Number(funding.amount)
      } else if (funding.fund.defaultAmount) {
        totalFunded += Number(funding.fund.defaultAmount)
      }
    }
  }

  // Group by focus area
  const focusAreaCounts: Record<string, { label: string; icon: string; count: number }> = {}
  for (const lda of ldas) {
    for (const fa of lda.focusAreas) {
      if (!focusAreaCounts[fa.id]) {
        focusAreaCounts[fa.id] = { label: fa.label, icon: fa.icon, count: 0 }
      }
      focusAreaCounts[fa.id].count++
    }
  }

  // Group by development stage
  const stageCounts: Record<string, { label: string; icon: string; count: number }> = {}
  for (const lda of ldas) {
    if (lda.developmentStage) {
      const key = lda.developmentStage.id.toString()
      if (!stageCounts[key]) {
        stageCounts[key] = { label: lda.developmentStage.label, icon: lda.developmentStage.icon, count: 0 }
      }
      stageCounts[key].count++
    }
  }

  // Group by province (organisation detail's physical province code).
  const provinceCounts = emptyProvinceCounts(provinces)
  for (const lda of ldas) {
    const code = lda.organisationDetail?.physicalProvince
    if (code && provinceCounts[code]) {
      provinceCounts[code].count++
    }
  }

  const totalLDAs = ldas.length
  const averagePerLDA = totalLDAs > 0 ? totalFunded / totalLDAs : 0

  return {
    totalActive: totalLDAs,
    totalFunded,
    averagePerLDA,
    byFocusArea: Object.values(focusAreaCounts).sort((a, b) => b.count - a.count),
    byDevelopmentStage: Object.values(stageCounts).sort((a, b) => b.count - a.count),
    byProvince: provinces.map(p => provinceCounts[p.code]),
  }
}

async function getFunderStats(filters: DashboardFilters, provinces: ProvinceRef[]) {
  const funderWhere: Record<string, unknown> = {
    fundingStatus: "Active",
  }

  if (filters.focusAreaIds?.length) {
    funderWhere.focusAreas = { some: { id: { in: filters.focusAreaIds } } }
  }
  if (filters.provinceCodes?.length) {
    funderWhere.organisationDetail = { physicalProvince: { in: filters.provinceCodes } }
  }

  const funders = await prisma.funder.findMany({
    where: funderWhere,
    include: {
      focusAreas: true,
      organisationDetail: { select: { physicalProvince: true } },
      fundFunders: {
        where: periodWhere(filters),
        include: {
          fund: true,
        },
      },
    },
  })

  // Calculate total contributions
  let totalContributions = 0
  const fundTypeCounts: Record<string, { label: string; count: number }> = {
    CORE_FUND: { label: "Core", count: 0 },
    PROJECT_FUND: { label: "Project", count: 0 },
  }

  for (const funder of funders) {
    for (const ff of funder.fundFunders) {
      totalContributions += Number(ff.amount)

      // Count by fund type
      const fundType = ff.fund.fundType
      if (fundTypeCounts[fundType]) {
        fundTypeCounts[fundType].count++
      }
    }
  }

  // Group by focus area
  const focusAreaCounts: Record<string, { label: string; icon: string; count: number }> = {}
  for (const funder of funders) {
    for (const fa of funder.focusAreas) {
      if (!focusAreaCounts[fa.id]) {
        focusAreaCounts[fa.id] = { label: fa.label, icon: fa.icon, count: 0 }
      }
      focusAreaCounts[fa.id].count++
    }
  }

  // Group by the funder's own province (organisation detail's physical province code).
  const provinceCounts = emptyProvinceCounts(provinces)
  for (const funder of funders) {
    const code = funder.organisationDetail?.physicalProvince
    if (code && provinceCounts[code]) {
      provinceCounts[code].count++
    }
  }

  const totalFunders = funders.length
  const averageContribution = totalFunders > 0 ? totalContributions / totalFunders : 0

  return {
    totalFunders,
    totalContributions,
    averageContribution,
    byFocusArea: Object.values(focusAreaCounts).sort((a, b) => b.count - a.count),
    byFundingType: Object.values(fundTypeCounts),
    byLocation: provinces.map(p => provinceCounts[p.code]),
  }
}

async function getFundStats(filters: DashboardFilters) {
  const fundWhere: Record<string, unknown> = {
    fundingStatus: "Active",
  }

  if (filters.fundType) {
    fundWhere.fundType = filters.fundType
  }
  if (filters.focusAreaIds?.length) {
    fundWhere.focusAreas = { some: { id: { in: filters.focusAreaIds } } }
  }

  const funds = await prisma.fund.findMany({
    where: fundWhere,
    include: {
      fundFunders: {
        where: periodWhere(filters),
      },
      fundLocalDevelopmentAgencies: {
        where: {
          fundingStatus: "Active",
          ...periodWhere(filters),
        },
      },
    },
  })

  let totalContributed = 0
  let totalScatFunded = 0

  for (const fund of funds) {
    // Sum contributions from funders
    for (const ff of fund.fundFunders) {
      totalContributed += Number(ff.amount)
    }

    // Sum disbursements to LDAs
    for (const fla of fund.fundLocalDevelopmentAgencies) {
      if (fla.amountType === "AD_HOC" && fla.amount) {
        totalScatFunded += Number(fla.amount)
      } else if (fund.defaultAmount) {
        totalScatFunded += Number(fund.defaultAmount)
      }
    }
  }

  const surplus = totalContributed - totalScatFunded

  return {
    totalFunds: funds.length,
    totalContributed,
    totalScatFunded,
    surplus,
  }
}

// Reporting tab: for each hardcoded indicator, count how often its phrases appear
// across ALL report answers (drafts included) and how many distinct reports
// contain them, plus the matching reports so the UI can link to each source.
//
// Search runs live against LocalDevelopmentAgencyForm.formData cast to text; the
// `formData_trgm_idx` GIN trigram index accelerates the ILIKE match. Occurrences
// are counted case-insensitively via the classic length/replace trick.
async function getReportingStats(filters: DashboardFilters) {
  // The LDA-level filters (province, stage, focus area) constrain WHICH reports
  // are searched, by their owning LDA. Only resolve them when at least one is
  // active, and reuse Prisma's relation handling rather than raw join-table SQL.
  let allowedLdaIds: number[] | null = null
  const ldaFilterActive =
    !!filters.provinceCodes?.length ||
    !!filters.developmentStageIds?.length ||
    !!filters.focusAreaIds?.length

  if (ldaFilterActive) {
    const ldaWhere: Record<string, unknown> = {}
    if (filters.provinceCodes?.length) {
      ldaWhere.organisationDetail = { physicalProvince: { in: filters.provinceCodes } }
    }
    if (filters.developmentStageIds?.length) {
      ldaWhere.developmentStageId = { in: filters.developmentStageIds }
    }
    if (filters.focusAreaIds?.length) {
      ldaWhere.focusAreas = { some: { id: { in: filters.focusAreaIds } } }
    }
    const ldas = await prisma.localDevelopmentAgency.findMany({ where: ldaWhere, select: { id: true } })
    allowedLdaIds = ldas.map(l => l.id)
    if (allowedLdaIds.length === 0) {
      // No LDA matches the filters → every indicator is zero.
      return REPORTING_INDICATORS.map(ind => ({
        key: ind.key,
        label: ind.label,
        occurrences: 0,
        reportCount: 0,
        reports: [] as { id: number; ldaId: number; title: string; ldaName: string; count: number }[],
      }))
    }
  }

  // Row-level filters applied to every indicator query (fundType is fund-level
  // and doesn't apply to reports, matching how the LDAs tab ignores it).
  const rowFilters: Prisma.Sql[] = []
  if (allowedLdaIds) rowFilters.push(Prisma.sql`f."localDevelopmentAgencyId" = ANY(${allowedLdaIds})`)
  if (filters.formStatusIds?.length) rowFilters.push(Prisma.sql`f."formStatusId" = ANY(${filters.formStatusIds})`)
  if (filters.periodStart) rowFilters.push(Prisma.sql`f."fundingEnd" >= ${new Date(filters.periodStart)}`)
  if (filters.periodEnd) rowFilters.push(Prisma.sql`f."fundingStart" <= ${new Date(filters.periodEnd)}`)

  const results = []
  for (const ind of REPORTING_INDICATORS) {
    // Match when any variant appears (ILIKE OR-chain → trigram index, case-insensitive).
    const matchOr = Prisma.join(
      ind.phrases.map(p => Prisma.sql`f."formData"::text ILIKE ${"%" + p + "%"}`),
      " OR ",
    )
    // Per-report occurrence count = sum over variants of (case-insensitive) hits.
    const occurrenceExpr = Prisma.join(
      ind.phrases.map(
        p => Prisma.sql`(char_length(lower(f."formData"::text)) - char_length(replace(lower(f."formData"::text), ${p}, ''))) / char_length(${p})`,
      ),
      " + ",
    )
    const where = Prisma.join([Prisma.sql`(${matchOr})`, ...rowFilters], " AND ")

    const rows = await prisma.$queryRaw<{ id: number; ldaId: number; title: string; ldaName: string; count: bigint }[]>(Prisma.sql`
      SELECT f.id, f."localDevelopmentAgencyId" AS "ldaId", f.title, lda.name AS "ldaName", (${occurrenceExpr})::bigint AS count
      FROM "LocalDevelopmentAgencyForm" f
      JOIN "LocalDevelopmentAgency" lda ON lda.id = f."localDevelopmentAgencyId"
      WHERE ${where}
      ORDER BY count DESC, f."updatedAt" DESC
    `)

    results.push({
      key: ind.key,
      label: ind.label,
      occurrences: rows.reduce((sum, r) => sum + Number(r.count), 0),
      reportCount: rows.length,
      reports: rows.slice(0, 20).map(r => ({
        id: r.id,
        ldaId: r.ldaId,
        title: r.title,
        ldaName: r.ldaName,
        count: Number(r.count),
      })),
    })
  }

  return results
}
