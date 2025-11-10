"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useCallback, useDeferredValue, useMemo, useState, startTransition, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { LimitedFundModel } from "@/types/models";
import { FocusArea, Province, FundStatus } from "@prisma/client";
import { DynamicIcon } from "../dynamicIcon";
import { format } from "date-fns";
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from "lucide-react"
import { FilterBar } from "../ui/filter-bar"
import { FilterOption } from "../ui/filter-button"
import { FormDialog } from "@/components/funds/form"
import { Funder } from "@prisma/client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FilteredFundsProps {
  funds: LimitedFundModel[]
  navigatedFrom?: string
  callback?: () => void
  funders?: Funder[]
  provinces?: Province[]
  focusAreas: FocusArea[]
}

type SortableColumn = 'name' | 'status' | 'startDate' | 'endDate' | 'amount' | null
type SortDirection = 'asc' | 'desc' | null



export const FilteredFunds: React.FC<FilteredFundsProps> = ({ funds, navigatedFrom, callback, provinces, focusAreas }) => {
  const [sortColumn, setSortColumn] = useState<SortableColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFundType, setSelectedFundType] = useState<'core' | 'project'>('core') // Default to Core Funds
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})

  // Defer filtering while user types -> smoother input
  const deferredSearch = useDeferredValue(searchTerm)

  // Use FundStatus enum for funding statuses
  const fundingStatuses = useMemo(() => 
    Object.values(FundStatus).map((status, idx) => ({ 
      id: idx + 1, 
      label: status 
    }))
  , [])

  const availableFundingPeriods = useMemo(() => {
    const years = new Set<number>();
    funds.forEach((fund) => {
      if (fund.fundingStart) years.add(new Date(fund.fundingStart).getFullYear());
      if (fund.fundingEnd) years.add(new Date(fund.fundingEnd).getFullYear());
    });
    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => ({ value: String(year), label: String(year) }));
  }, [funds])

  const getFundLink = useCallback((fundId: number): string => {
    return navigatedFrom
      ? `/dashboard/funds/${fundId}?from=${navigatedFrom}`
      : `/dashboard/funds/${fundId}`;
  }, [navigatedFrom])

  // Check if fund matches selected type (core/project/all)
  const isFundType = useCallback((fund: LimitedFundModel, type: string) => {
    if (type === 'all') return true
    if (type === 'core') return fund.fundType === 'CORE_FUND'
    if (type === 'project') return fund.fundType === 'PROJECT_FUND'
    return true
  }, [])

  // Filter configuration - dynamic based on fund type
  // Core Funds: Year, Status
  // Project Funds: Year, Status, Focus Areas
  const filterConfigs = useMemo(() => {
    const baseFilters = [
      {
        type: 'fundingPeriods',
        label: 'Year',
        options: availableFundingPeriods.map(period => ({
          id: period.value,
          label: period.label
        }))
      },
      {
        type: 'fundingStatus',
        label: 'Status',
        options: fundingStatuses.map(status => ({
          id: String(status.id),
          label: status.label
        }))
      }
    ]

    // Add Focus Areas filter only for Project Funds
    if (selectedFundType === 'project') {
      baseFilters.push({
        type: 'focusAreas',
        label: 'Focus Areas',
        options: focusAreas.map(area => ({
          id: String(area.id),
          label: area.label
        }))
      })
    }

    return baseFilters
  }, [selectedFundType, availableFundingPeriods, fundingStatuses, focusAreas])

  // Clear filters that are not available in the current fund type
  useEffect(() => {
    if (selectedFundType === 'core') {
      setActiveFilters(prev => {
        const { ...rest } = prev
        return rest
      })
    }
  }, [selectedFundType])

  // Filtering logic
  const filteredFunds = useMemo(() => {
    return funds.filter((fund) => {
      // Fund type filter
      const fundTypeMatch = isFundType(fund, selectedFundType)

      // Search filter
      const searchMatch = deferredSearch.trim() === "" ||
        fund.name.toLowerCase().includes(deferredSearch.toLowerCase())

      // Active filters
      const filtersMatch = Object.entries(activeFilters).every(([filterKey, selectedOptions]) => {
        if (selectedOptions.length === 0) return true

        switch (filterKey) {
          case 'fundingStatus':
            return selectedOptions.some(option => fund.fundingStatus === option.label)
          case 'focusAreas':
            return fund.focusAreas.some(area => 
              selectedOptions.some(option => String(area.id) === option.id)
            )
          case 'fundingPeriods':
            const fundingStartYear = fund.fundingStart ? new Date(fund.fundingStart).getFullYear() : null
            const fundingEndYear = fund.fundingEnd ? new Date(fund.fundingEnd).getFullYear() : null
            return selectedOptions.some(option => 
              String(fundingStartYear) === option.id || String(fundingEndYear) === option.id
            )
          default:
            return true
        }
      })

      return fundTypeMatch && searchMatch && filtersMatch
    })
  }, [funds, deferredSearch, activeFilters, selectedFundType, isFundType])

  // Sorting logic
  const sortedFunds = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredFunds

    return [...filteredFunds].sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'status':
          aValue = a.fundingStatus.toLowerCase()
          bValue = b.fundingStatus.toLowerCase()
          break
        case 'startDate':
          aValue = new Date(a.fundingStart)
          bValue = new Date(b.fundingStart)
          break
        case 'endDate':
          aValue = new Date(a.fundingEnd)
          bValue = new Date(b.fundingEnd)
          break
        case 'amount':
          aValue = Number(a.amount)
          bValue = Number(b.amount)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredFunds, sortColumn, sortDirection])

  // Event handlers
  const handleSort = useCallback((column: SortableColumn) => {
    startTransition(() => {
      if (sortColumn === column) {
        if (sortDirection === 'asc') {
          setSortDirection('desc')
        } else if (sortDirection === 'desc') {
          setSortColumn(null)
          setSortDirection(null)
        } else {
          setSortDirection('asc')
        }
      } else {
        setSortColumn(column)
        setSortDirection('asc')
      }
    })
  }, [sortColumn, sortDirection])

  const handleSearch = useCallback((value: string) => {
    startTransition(() => {
      setSearchTerm(value)
    })
  }, [])

  const handleFilterChange = useCallback((filterKey: string, selectedOptions: FilterOption[]) => {
    startTransition(() => {
      setActiveFilters(prev => ({
        ...prev,
        [filterKey]: selectedOptions
      }))
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    startTransition(() => {
      setActiveFilters({})
      // Keep the selected fund type, only reset filters
    })
  }, [])

  // Fund row component - dynamic based on fund type
  const FundRow = useCallback(({ fund }: { fund: LimitedFundModel }) => (
    <TableRow key={fund.id}>
      <TableCell className="p-3 w-1/3">
        <Link href={getFundLink(fund.id)} className="font-medium">{fund.name}</Link>
      </TableCell>
      <TableCell className="p-3">R{Number(fund.amount).toLocaleString()}</TableCell>
      <TableCell className="p-3">{fund.fundLocalDevelopmentAgencies.length || 0}</TableCell>
      <TableCell className="p-3">{fund.fundFunders.length || 0}</TableCell>
      <TableCell className="p-3">
        <Badge 
          variant="outline" 
          className={`${
            fund.fundingStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
            fund.fundingStatus === 'Paused' ? 'bg-orange-50 text-orange-700 border-orange-200' :
            fund.fundingStatus === 'Cancelled' ? 'bg-gray-50 text-gray-700 border-gray-200' :
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {fund.fundingStatus}
        </Badge>
      </TableCell>
      {selectedFundType === 'project' && (
        <TableCell className="p-3">
          <div className="flex items-center space-x-2">
            {fund.focusAreas.map((fa) => (
              <Badge
                key={`fund-${fund.id}-focusArea-${fa.id}`}
                variant="outline"
                title={fa.label}
                className="p-1"
              >
                <DynamicIcon name={fa.icon} size={14} className="m-0" />
              </Badge>
            ))}
          </div>
        </TableCell>
      )}
      <TableCell className="p-3 text-nowrap">{format(fund.fundingStart, 'MMM d, yyyy')}</TableCell>
      <TableCell className="p-3 text-nowrap">{format(fund.fundingEnd, 'MMM d, yyyy')}</TableCell>
    </TableRow>
  ), [getFundLink, selectedFundType])

  return (
    <>
      {/* Dynamic Heading */}
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">
          {selectedFundType === 'project' ? 'Project Funds' : 'Funds'}
        </h1>
      </div>

      <div className="space-y-4 mt-4">
        {/* Fund Type Tabs */}
        <Tabs value={selectedFundType} onValueChange={(value) => setSelectedFundType(value as 'core' | 'project')}>
          <TabsList>
            <TabsTrigger value="core" className="text-slate-700">Core Funds</TabsTrigger>
            <TabsTrigger value="project" className="text-slate-700">Project Funds</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                type="search"
                id="search"
                placeholder="Filter funds..."
                className="pr-8 h-9"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <FilterBar
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              filterConfigs={filterConfigs}
              activeFilters={activeFilters}
              className="hidden md:flex"
            />
          </div>
          {callback && provinces && focusAreas && (
            <FormDialog 
              provinces={provinces} 
              focusAreas={focusAreas} 
              callback={callback} 
            />
          )}
        </div>
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="h-[calc(100vh-650px)] min-h-[300px] overflow-y-auto">
              <Table className="text-xs w-full relative">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="h-12 cursor-pointer select-none w-1/3 pl-3" onClick={() => handleSort('name')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Name</span>
                        <span className="ml-1">
                          {sortColumn === 'name' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none pl-3" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Amount</span>
                        <span className="ml-1">
                          {sortColumn === 'amount' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 text-nowrap pl-3">
                      <span className="font-medium">LDAs</span>
                    </TableHead>
                    <TableHead className="h-12 pl-3">
                      <span className="font-medium">Funders</span>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none pl-3" onClick={() => handleSort('status')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Status</span>
                        <span className="ml-1">
                          {sortColumn === 'status' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    {selectedFundType === 'project' && (
                      <TableHead className="h-12 text-nowrap pl-3">
                        <span className="font-medium">Focus Areas</span>
                      </TableHead>
                    )}
                    <TableHead className="h-12 cursor-pointer select-none text-nowrap pl-3" onClick={() => handleSort('startDate')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Start Date</span>
                        <span className="ml-1">
                          {sortColumn === 'startDate' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none text-nowrap pl-3" onClick={() => handleSort('endDate')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">End Date</span>
                        <span className="ml-1">
                          {sortColumn === 'endDate' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFunds.length > 0 ? (
                    sortedFunds.map(fund => <FundRow key={fund.id} fund={fund} />)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={selectedFundType === 'project' ? 8 : 7} className="text-center py-8 text-gray-500">
                        No funds found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {sortedFunds.length > 0 && (
          <p className="text-sm text-gray-500 pt-4">Showing {sortedFunds.length} of {funds.length} funds</p>
        )}
      </div>
    </>
  )
}