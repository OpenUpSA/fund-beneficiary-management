"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon } from "lucide-react"
import { Badge } from "../ui/badge"
import Link from "next/link"
import { availableReportingStatuses } from "@/app/data"
import { LocalDevelopmentAgencyFull, UserWithLDAsBasic } from "@/types/models"
import { FocusArea, FundingStatus, Province, DevelopmentStage } from "@prisma/client"
import { DynamicIcon } from "../dynamicIcon"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { FormDialog } from "@/components/ldas/form"
import React, { useCallback, useMemo, useState, useDeferredValue, startTransition } from "react"

const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("")
const getShortName = (name: string) => name.split(" ").map(w => w[0]).join("")

type SortDirection = 'asc' | 'desc' | null
type SortableColumn = 'name' | 'status' | null

interface FilteredLDAsProps {
  ldas: LocalDevelopmentAgencyFull[]
  navigatedFrom?: string
  focusAreas: FocusArea[]
  developmentStages: DevelopmentStage[]
  programmeOfficers: UserWithLDAsBasic[]
  provinces: Province[]
  fundingStatus: FundingStatus[]
  callback?: (ldaId?: number) => void
}

export const FilteredLDAs: React.FC<FilteredLDAsProps> = ({
  ldas,
  navigatedFrom,
  focusAreas,
  developmentStages,
  programmeOfficers,
  provinces,
  fundingStatus,
  callback
}) => {
  const [sortColumn, setSortColumn] = useState<SortableColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})

  // Defer filtering while user types -> smoother input
  const deferredSearch = useDeferredValue(searchTerm)

  // Build once
  const provinceMap = useMemo(() => {
    const m = new Map<string, { label: string; shortName: string }>()
    for (const { name, code } of provinces) m.set(code, { label: name, shortName: getShortName(name) })
    return m
  }, [provinces])

  const statusOptions = useMemo<FilterOption[]>(
    () => fundingStatus.map(({ id, label }) => ({ id: String(id), label })),
    [fundingStatus]
  )
  const locationOptions = useMemo<FilterOption[]>(
    () => provinces.map(({ id, name }) => ({ id: String(id), label: name })),
    [provinces]
  )
  const stageOptions = useMemo<FilterOption[]>(
    () => developmentStages.map(({ id, label }) => ({ id: String(id), label })),
    [developmentStages]
  )
  const focusOptions = useMemo<FilterOption[]>(
    () => focusAreas.map(({ id, label }) => ({ id: String(id), label })),
    [focusAreas]
  )
  const reportingOptions = useMemo<FilterOption[]>(
    () => availableReportingStatuses.map(({ value, label }) => ({ id: String(value), label })),
    []
  )
  const poOptions = useMemo<FilterOption[]>(
    () => programmeOfficers.map(({ id, name }) => ({ id: String(id), label: name })),
    [programmeOfficers]
  )

  const filterConfigs = useMemo(() => ([
    { type: 'status', label: 'Status', options: statusOptions },
    { type: 'stage', label: 'Stage', options: stageOptions },
    { type: 'location', label: 'Province', options: locationOptions },
    { type: 'focus', label: 'Focus area', options: focusOptions },
    { type: 'reporting', label: 'Reporting', options: reportingOptions },
    { type: 'po', label: 'PO', options: poOptions },
  ]), [statusOptions, stageOptions, locationOptions, focusOptions, reportingOptions, poOptions])

  const handleSort = useCallback((column: SortableColumn) => {
    setSortColumn(prev => {
      console.log(prev, column)
      if (prev === column) {
        setSortDirection(dir => (dir === 'asc' ? 'desc' : dir === 'desc' ? null : 'asc'))
        return column
      }
      setSortDirection('asc')
      return column
    })
  }, [])

  const handleSearch = useCallback((term: string) => setSearchTerm(term), [])

  const handleFilterChange = useCallback((filterType: string, selected: FilterOption[]) => {
    // Avoid blocking input while we compute
    startTransition(() => {
      setActiveFilters(prev => ({ ...prev, [filterType]: selected }))
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    startTransition(() => {
      setActiveFilters({})
      setSearchTerm("")
    })
  }, [])

  const getLDAlink = useCallback((ldaid: number) => {
    return navigatedFrom
      ? `/dashboard/ldas/${ldaid}?from=${navigatedFrom}`
      : `/dashboard/ldas/${ldaid}`
  }, [navigatedFrom])

  // Precompute lowercase names for search once per LDA array
  const ldasIndexed = useMemo(() => {
    return ldas.map(lda => ({ ...lda, _lcName: lda.name.toLowerCase() }))
  }, [ldas])

  const filteredLDAs = useMemo(() => {
    const sel = (k: string) => (activeFilters[k] || []).map(o => o.id)
    const focusSel = sel('focus')
    const locSel = sel('location')
    const stageSel = sel('stage')
    const statusSel = sel('status')
    const reportingSel = sel('reporting') // unused for now
    const poSel = sel('po')

    let result = ldasIndexed.filter(lda => {
      if (deferredSearch && !lda._lcName.includes(deferredSearch.toLowerCase())) return false

      const focusMatch = !focusSel.length || lda.focusAreas.some(f => focusSel.includes(String(f.id)))
      const locMatch = !locSel.length || locSel.includes(String(lda.locationId))
      const stageMatch = !stageSel.length || stageSel.includes(String(lda.developmentStageId))
      const statusMatch = !statusSel.length || statusSel.includes(String(lda.fundingStatusId))
      const poMatch = !poSel.length || (lda.programmeOfficerId && poSel.includes(String(lda.programmeOfficerId)))
      const reportingMatch = !reportingSel.length // TODO when model supports it

      return focusMatch && locMatch && stageMatch && statusMatch && poMatch && reportingMatch
    })

    if (sortColumn && sortDirection) {
      const dir = sortDirection === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        if (sortColumn === 'name') {
          return dir * a.name.localeCompare(b.name)
        }
        if (sortColumn === 'status') {
          const sa = a.fundingStatus?.label || ''
          const sb = b.fundingStatus?.label || ''
          return dir * sa.localeCompare(sb)
        }
        return 0
      })
    }
    return result
  }, [ldasIndexed, deferredSearch, activeFilters, sortColumn, sortDirection])

  // Province badge renderer (stable)
  const ProvinceBadge = useCallback(({ code }: { code?: string }) => {
    if (!code) return null
    const info = provinceMap.get(code)
    if (!info) return null
    return <Badge variant="outline" title={info.label}>{info.shortName}</Badge>
  }, [provinceMap])

  const LdaRow = useMemo(() => React.memo(function LdaRow({ lda }: { lda: LocalDevelopmentAgencyFull }) {
    return (
      <TableRow key={lda.id}>
        <TableCell className="p-2">
          <Link href={getLDAlink(lda.id)}>{lda.name}</Link>
        </TableCell>
        <TableCell className="p-2">
          {lda.fundingStatus && <Badge variant="outline">{lda.fundingStatus.label}</Badge>}
        </TableCell>
        <TableCell className="p-2">
          {lda.developmentStage && <Badge variant="outline">{lda.developmentStage.label}</Badge>}
        </TableCell>
        <TableCell className="text-nowrap p-2">
          {lda.organisationDetail?.physicalProvince && <ProvinceBadge code={lda.organisationDetail.physicalProvince} />}
        </TableCell>
        <TableCell className="p-2">
          <div className="flex items-center space-x-2">
            {lda.focusAreas.map(fa => (
              <Badge
                key={`lda-${lda.id}-focusArea-${fa.id}`}
                variant="outline"
                title={fa.label}
                className="p-1"
              >
                <DynamicIcon name={fa.icon} size={14} className="m-0" />
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="p-2">
          <Badge
            variant="outline"
            className="text-slate-700 border-slate-200 border rounded-full w-6 h-6 text-xs flex items-center justify-center p-0"
            title={lda.programmeOfficer?.name ?? "No Programme Officer assigned"}
          >
            {getInitials(lda.programmeOfficer?.name ?? "")}
          </Badge>
        </TableCell>
      </TableRow>
    )
  }), [ProvinceBadge, getLDAlink])
  // ^ React.memo prevents re-render of rows when unrelated state changes

  return (
    <>
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                type="search"
                id="search"
                placeholder="Filter LDAs..."
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
          {callback && (
            <FormDialog
              focusAreas={focusAreas}
              developmentStages={developmentStages}
              programmeOfficers={programmeOfficers}
              provinces={provinces}
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
                    <TableHead className="h-10 cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <div className="flex items-center justify-start">
                        <span>Name</span>
                        <span className="ml-1">
                          {sortColumn === 'name' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-10 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center justify-start">
                        <span>Status</span>
                        <span className="ml-1">
                          {sortColumn === 'status' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-10">Stage</TableHead>
                    <TableHead className="h-10">Province</TableHead>
                    <TableHead className="h-10 text-nowrap">Focus area(s)</TableHead>
                    <TableHead className="h-10"><abbr title="Programme Officer">PO</abbr></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredLDAs.length > 0 ? (
                    filteredLDAs.map(lda => <LdaRow key={lda.id} lda={lda} />)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No LDAs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {ldas.length > 0 && (
        <p className="text-sm text-gray-500 pt-4">Showing {filteredLDAs.length} of {ldas.length} LDAs</p>
      )}
    </>
  )
}
