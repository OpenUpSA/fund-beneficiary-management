"use client"

import { useState, useEffect, useMemo, useCallback, startTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "./stat-card"
import { HorizontalBarChart } from "./horizontal-bar-chart"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import {
  Target, 
  MapPin,
  ArrowUpDown,
  TriangleRight,
  Handshake,
  Banknote,
  HandCoins
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

interface DashboardData {
  lda: LDAStats
  funder: FunderStats
  fund: FundStats
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
    const periodId = activeFilters['period']?.[0]?.id as string | undefined
    const { periodStart, periodEnd } = getPeriodRange(periodId)
    return { provinceCodes, developmentStageIds, focusAreaIds, fundType, periodStart, periodEnd }
  }, [activeFilters])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (apiFilters.provinceCodes.length) params.set("provinceCodes", apiFilters.provinceCodes.join(","))
      if (apiFilters.developmentStageIds.length) params.set("developmentStageIds", apiFilters.developmentStageIds.join(","))
      if (apiFilters.focusAreaIds.length) params.set("focusAreaIds", apiFilters.focusAreaIds.join(","))
      if (apiFilters.fundType) params.set("fundType", apiFilters.fundType)
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

    if (activeTab === 'ldas') {
      // Funding type is a fund-level attribute and doesn't apply to LDAs.
      return [period, stage, location, focus]
    }
    // Funders / Funds — to be refined later.
    return [period, stage, location, fundType, focus]
  }, [activeTab, periodOptions, stageOptions, locationOptions, fundTypeOptions, focusOptions])

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
      </Tabs>
    </div>
  )
}
