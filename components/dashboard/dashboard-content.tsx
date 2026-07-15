"use client"

import { useState, useEffect, useMemo, useCallback, startTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { StatCard } from "./stat-card"
import { HorizontalBarChart } from "./horizontal-bar-chart"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { Link } from "@/i18n/routing"
import {
  Target,
  MapPin,
  ArrowUpDown,
  TriangleRight,
  Handshake,
  Banknote,
  HandCoins,
  FileText
} from "lucide-react"

interface ApiFilterOption {
  id: number
  label: string
  short?: string
  icon?: string
}

interface FilterOptions {
  provinces: { id: string; label: string }[]
  developmentStages: ApiFilterOption[]
  focusAreas: ApiFilterOption[]
  fundTypes: { value: string; label: string }[]
  formStatuses: { id: number; label: string }[]
}

interface LDAStats {
  totalActive: number
  totalFunded: number
  averagePerLDA: number
  byFocusArea: { label: string; icon: string; count: number }[]
  byDevelopmentStage: { label: string; icon: string; count: number }[]
  byProvince: { label: string; short: string; count: number }[]
}

interface FunderStats {
  totalFunders: number
  totalContributions: number
  averageContribution: number
  byFocusArea: { label: string; icon: string; count: number }[]
  byFundingType: { label: string; count: number }[]
  byLocation: { label: string; short: string; count: number }[]
}

interface FundStats {
  totalFunds: number
  totalContributed: number
  totalScatFunded: number
  surplus: number
}

interface ReportingReport {
  id: number
  ldaId: number
  title: string
  ldaName: string
  count: number
  // Sections the keyword was attributed to, with highlighted context snippets.
  // May be empty even for a matched report (see the reporting stats API) — the
  // whole-report link is the fallback.
  sections: {
    index: number
    title: string
    count: number
    snippets: {
      fieldName: string
      fieldLabel: string
      before: string
      match: string
      after: string
      clippedStart: boolean
      clippedEnd: boolean
    }[]
  }[]
}

interface ReportingIndicatorStat {
  key: string
  label: string
  occurrences: number
  reportCount: number
  reports: ReportingReport[]
}

interface DashboardData {
  lda: LDAStats
  funder: FunderStats
  fund: FundStats
  reporting: ReportingIndicatorStat[]
  filterOptions: FilterOptions
}

// Translate a period filter id into a concrete date range.
// Returns ISO date strings, or an empty object for "all time" / no selection.
function getPeriodRange(periodId?: string): { periodStart?: string; periodEnd?: string } {
  if (!periodId || periodId === "all_time") return {}

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const quarterStartMonth = Math.floor(month / 3) * 3

  switch (periodId) {
    case "quarter_to_date":
      return {
        periodStart: new Date(year, quarterStartMonth, 1).toISOString(),
        periodEnd: now.toISOString(),
      }
    case "year_to_date":
      return {
        periodStart: new Date(year, 0, 1).toISOString(),
        periodEnd: now.toISOString(),
      }
    case "last_quarter":
      return {
        periodStart: new Date(year, quarterStartMonth - 3, 1).toISOString(),
        periodEnd: new Date(year, quarterStartMonth, 0, 23, 59, 59).toISOString(),
      }
    case "last_year":
      return {
        periodStart: new Date(year - 1, 0, 1).toISOString(),
        periodEnd: new Date(year - 1, 11, 31, 23, 59, 59).toISOString(),
      }
    default:
      return {}
  }
}

export function DashboardContent() {
  const [activeTab, setActiveTab] = useState("ldas")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})

  // Convert activeFilters to API params
  const apiFilters = useMemo(() => {
    const provinceCodes = (activeFilters['location'] || []).map(o => String(o.id))
    const developmentStageIds = (activeFilters['stage'] || []).map(o => Number(o.id))
    const focusAreaIds = (activeFilters['focus'] || []).map(o => Number(o.id))
    const fundType = activeFilters['fundType']?.[0]?.id as string | undefined
    const formStatusIds = (activeFilters['reportStatus'] || []).map(o => Number(o.id))
    const periodId = activeFilters['period']?.[0]?.id as string | undefined
    const { periodStart, periodEnd } = getPeriodRange(periodId)
    return { provinceCodes, developmentStageIds, focusAreaIds, fundType, formStatusIds, periodStart, periodEnd }
  }, [activeFilters])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (apiFilters.provinceCodes.length) params.set("provinceCodes", apiFilters.provinceCodes.join(","))
      if (apiFilters.developmentStageIds.length) params.set("developmentStageIds", apiFilters.developmentStageIds.join(","))
      if (apiFilters.focusAreaIds.length) params.set("focusAreaIds", apiFilters.focusAreaIds.join(","))
      if (apiFilters.fundType) params.set("fundType", apiFilters.fundType)
      if (apiFilters.formStatusIds.length) params.set("formStatusIds", apiFilters.formStatusIds.join(","))
      if (apiFilters.periodStart) params.set("periodStart", apiFilters.periodStart)
      if (apiFilters.periodEnd) params.set("periodEnd", apiFilters.periodEnd)

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [apiFilters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Build filter options from API data
  const stageOptions = useMemo<FilterOption[]>(
    () => (data?.filterOptions.developmentStages || []).map(({ id, label }) => ({ id: String(id), label })),
    [data?.filterOptions.developmentStages]
  )
  const locationOptions = useMemo<FilterOption[]>(
    () => (data?.filterOptions.provinces || []).map(({ id, label }) => ({ id, label })),
    [data?.filterOptions.provinces]
  )
  const focusOptions = useMemo<FilterOption[]>(
    () => (data?.filterOptions.focusAreas || []).map(({ id, label }) => ({ id: String(id), label })),
    [data?.filterOptions.focusAreas]
  )
  const fundTypeOptions = useMemo<FilterOption[]>(
    () => (data?.filterOptions.fundTypes || []).map(({ value, label }) => ({ id: value, label })),
    [data?.filterOptions.fundTypes]
  )
  const reportStatusOptions = useMemo<FilterOption[]>(
    () => (data?.filterOptions.formStatuses || []).map(({ id, label }) => ({ id: String(id), label })),
    [data?.filterOptions.formStatuses]
  )

  // Period filter options
  const periodOptions = useMemo<FilterOption[]>(() => [
    { id: 'quarter_to_date', label: 'Quarter to date' },
    { id: 'year_to_date', label: 'Year to date' },
    { id: 'last_quarter', label: 'Last quarter' },
    { id: 'last_year', label: 'Last year' },
    { id: 'all_time', label: 'All time' },
  ], [])

  // Filters are tab-specific — each tab only shows the filters that apply to it.
  const filterConfigs = useMemo(() => {
    const period = { type: 'period', label: 'Period', options: periodOptions, singleSelect: true }
    const stage = { type: 'stage', label: 'LDA Stage', options: stageOptions }
    const location = { type: 'location', label: 'Location', options: locationOptions }
    const fundType = { type: 'fundType', label: 'Funding type', options: fundTypeOptions }
    const focus = { type: 'focus', label: 'Focus area', options: focusOptions }
    const reportStatus = { type: 'reportStatus', label: 'Report status', options: reportStatusOptions }

    if (activeTab === 'reporting') {
      // Report indicators are filtered by their owning LDA plus report status.
      return [period, reportStatus, stage, location, focus]
    }
    if (activeTab === 'ldas') {
      // Funding type is a fund-level attribute and doesn't apply to LDAs.
      return [period, stage, location, focus]
    }
    // Funders / Funds — to be refined later.
    return [period, stage, location, fundType, focus]
  }, [activeTab, periodOptions, stageOptions, locationOptions, fundTypeOptions, focusOptions, reportStatusOptions])

  const handleFilterChange = useCallback((filterType: string, selected: FilterOption[]) => {
    startTransition(() => {
      setActiveFilters(prev => ({ ...prev, [filterType]: selected }))
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    startTransition(() => {
      setActiveFilters({})
    })
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="ldas" className="data-[state=active]:bg-white">LDAs</TabsTrigger>
          <TabsTrigger value="funders" className="data-[state=active]:bg-white">Funders</TabsTrigger>
          <TabsTrigger value="funds" className="data-[state=active]:bg-white">Funds</TabsTrigger>
          <TabsTrigger value="reporting" className="data-[state=active]:bg-white">Reporting</TabsTrigger>
        </TabsList>

        {/* Filters - using same FilterBar as LDAs page */}
        <div className="flex items-center gap-2 mt-4">
          <FilterBar
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
          />
        </div>

        {/* LDAs Tab */}
        <TabsContent value="ldas" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              title="Total Active LDAs" 
              value={data?.lda.totalActive || 0} 
              icon={Handshake}
            />
            <StatCard 
              title="Total amount funded" 
              value={data?.lda.totalFunded || 0} 
              icon={Banknote}
              format="currency"
            />
            <StatCard 
              title="Average amount per LDA" 
              value={data?.lda.averagePerLDA || 0} 
              icon={HandCoins}
              format="currency"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <HorizontalBarChart
              title="LDAs per focus area" 
              icon={Target}
              items={data?.lda.byFocusArea || []}
              showIcons
            />
            <HorizontalBarChart
              title="LDAs per development stage"
              icon={TriangleRight}
              items={data?.lda.byDevelopmentStage || []}
              showIcons
            />
            <HorizontalBarChart 
              title="LDAs per province" 
              icon={MapPin}
              items={data?.lda.byProvince || []}
            />
          </div>
        </TabsContent>

        {/* Funders Tab */}
        <TabsContent value="funders" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              title="Total funders" 
              value={data?.funder.totalFunders || 0} 
              icon={Handshake}
            />
            <StatCard 
              title="Total funder contributions" 
              value={data?.funder.totalContributions || 0} 
              icon={Banknote}
              format="currency"
            />
            <StatCard 
              title="Average funder contribution" 
              value={data?.funder.averageContribution || 0} 
              icon={HandCoins}
              format="currency"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <HorizontalBarChart
              title="Funders per focus area" 
              icon={Target}
              items={data?.funder.byFocusArea || []}
              showIcons
            />
            <HorizontalBarChart 
              title="Funders by funding type" 
              icon={TriangleRight}
              items={data?.funder.byFundingType || []}
            />
            <HorizontalBarChart 
              title="Funders by location" 
              icon={MapPin}
              items={data?.funder.byLocation || []}
            />
          </div>
        </TabsContent>

        {/* Funds Tab */}
        <TabsContent value="funds" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard 
              title="Total funds" 
              value={data?.fund.totalFunds || 0} 
              icon={Handshake}
            />
            <StatCard 
              title="Total funds contributed" 
              value={data?.fund.totalContributed || 0} 
              icon={Banknote}
              format="currency"
            />
            <StatCard 
              title="Total SCAT funded" 
              value={data?.fund.totalScatFunded || 0} 
              icon={HandCoins}
              format="currency"
            />
            <StatCard
              title="Total surplus/shortfall"
              value={data?.fund.surplus || 0}
              icon={ArrowUpDown}
              format="currency"
            />
          </div>
        </TabsContent>

        {/* Reporting Tab — indicator keyword counts across report answers, with
            links to each source report. No charts by design. */}
        <TabsContent value="reporting" className="mt-6 space-y-6">
          <div className="rounded-lg border bg-white">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Indicator</span>
              <span className="w-24 text-right">Occurrences</span>
              <span className="w-20 text-right">Reports</span>
            </div>

            <Accordion type="multiple" className="w-full">
              {(data?.reporting || []).map((indicator) => (
                <AccordionItem key={indicator.key} value={indicator.key} className="border-b last:border-b-0 px-4">
                  <AccordionTrigger className="hover:no-underline py-3" disabled={indicator.reportCount === 0}>
                    <div className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 pr-2 text-left">
                      <span className="text-sm font-medium text-slate-900">{indicator.label}</span>
                      <span className="w-24 text-right text-lg font-bold tabular-nums">
                        {indicator.occurrences.toLocaleString("en-ZA")}
                      </span>
                      <span className="w-20 text-right text-sm text-muted-foreground tabular-nums">
                        {indicator.reportCount.toLocaleString("en-ZA")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {indicator.reports.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">No matching reports yet.</p>
                    ) : (
                      <ul className="space-y-1 pb-2">
                        {indicator.reports.map((report) => (
                          <li key={report.id} className="rounded-md px-2 py-1 hover:bg-slate-50">
                            <Link
                              href={`/dashboard/ldas/${report.ldaId}/funding-reports/${report.id}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 py-1 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-slate-900">{report.title}</span>
                                <span className="truncate text-muted-foreground">· {report.ldaName}</span>
                              </span>
                              <span className="shrink-0 text-muted-foreground tabular-nums">
                                {report.count.toLocaleString("en-ZA")}×
                              </span>
                            </Link>
                            {report.sections.length > 0 ? (
                              <div className="space-y-2 pb-2 pl-6">
                                {report.sections.map((section) => (
                                  <div key={section.index}>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                      <span className="truncate">{section.title}</span>
                                      <span className="shrink-0 font-normal text-muted-foreground">
                                        ({section.count.toLocaleString("en-ZA")})
                                      </span>
                                    </div>
                                    <ul className="mt-1 space-y-1">
                                      {section.snippets.map((snippet, i) => (
                                        <li key={`${snippet.fieldName}-${i}`}>
                                          <Link
                                            href={`/dashboard/ldas/${report.ldaId}/funding-reports/${report.id}/?section=${section.index}&field=${encodeURIComponent(snippet.fieldName)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-md border border-transparent px-2 py-1 hover:border-slate-200 hover:bg-slate-50"
                                            title={`Open “${section.title}” → ${snippet.fieldLabel}`}
                                          >
                                            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                                              {snippet.fieldLabel}
                                            </span>
                                            <span className="block text-xs leading-relaxed text-slate-600">
                                              {snippet.clippedStart ? "… " : ""}
                                              {snippet.before}{" "}
                                              <mark className="rounded bg-yellow-200 px-0.5 text-slate-900">
                                                {snippet.match}
                                              </mark>{" "}
                                              {snippet.after}
                                              {snippet.clippedEnd ? " …" : ""}
                                            </span>
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="pb-1 pl-6 text-xs italic text-muted-foreground">
                                Matched, but the section couldn’t be pinpointed — open the report to view.
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <p className="text-xs text-muted-foreground">
            Counts reflect exact-phrase matches (and close variants) across all report answers, including drafts.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
