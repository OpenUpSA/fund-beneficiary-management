"use client"

// import { FunderFull } from '@/types/models'

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import React, { useCallback, useMemo, useState, useDeferredValue, startTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, MoreHorizontal, Pencil, Trash2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { DynamicIcon } from "@/components/dynamicIcon"
import { format } from "date-fns"
import { FocusArea, Funder, Province } from '@prisma/client'
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { FormDialog } from "@/components/funders/form"
import { LinkFunderDialog } from "@/components/funders/link-funder-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FunderWithFocusAreas } from "@/types/models"

type SortDirection = 'asc' | 'desc' | null
type SortableColumn = 'name' | 'amount' | 'focusArea' | 'status' | 'dateAdded' | 'fundingEnd' | null


interface FilteredFundersProps {
  funders: FunderWithFocusAreas[]
  navigatedFrom?: string
  callback?: () => void
  focusAreasData: FocusArea[]
  provinces: Province[]
  fundId?: number
  fundName?: string
  allFunders?: Funder[]
}

export const FilteredFunders: React.FC<FilteredFundersProps> = ({ funders, navigatedFrom, focusAreasData, provinces, fundId, fundName, allFunders, callback }) => {
  const [sortColumn, setSortColumn] = useState<SortableColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})
  const [funderToEdit, setFunderToEdit] = useState<FunderWithFocusAreas | null>(null)
  const [funderToDelete, setFunderToDelete] = useState<FunderWithFocusAreas | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Defer filtering while user types -> smoother input
  const deferredSearch = useDeferredValue(searchTerm)

  const fundingStatusesFromFunders = Array.from(
    new Set(funders.map((funder) => funder.fundingStatus))
  )

  const statusOptions = useMemo<FilterOption[]>(
    () => fundingStatusesFromFunders.map((status) => ({ id: status, label: status })),
    [fundingStatusesFromFunders]
  )
  
  const focusOptions = useMemo<FilterOption[]>(
    () => focusAreasData.map(({ id, label }) => ({ id: String(id), label })),
    [focusAreasData]
  )

  const filterConfigs = useMemo(() => ([
    { type: 'status', label: 'Status', options: statusOptions },
    { type: 'focus', label: 'Focus areas', options: focusOptions },
  ]), [statusOptions, focusOptions])

  const getFunderLink = useCallback((funderId: number): string => {
    return navigatedFrom
      ? `/dashboard/funders/${funderId}?from=${navigatedFrom}`
      : `/dashboard/funders/${funderId}`;
  }, [navigatedFrom])

  const handleSort = useCallback((column: SortableColumn) => {
    setSortColumn(prev => {
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

  const handleDeleteFunder = async () => {
    if (!funderToDelete || !fundId) return

    setIsDeleting(true)
    const toastId = toast.loading('Removing funder...')

    try {
      const response = await fetch(`/api/fund-funder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId: fundId,
          funderId: funderToDelete.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove funder')
      }

      toast.success('Funder removed successfully', { id: toastId })
      setFunderToDelete(null)
      
      if (callback) {
        callback()
      }
    } catch (error) {
      console.error('Error removing funder:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove funder', { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  // Precompute lowercase names for search once per funder array
  const fundersIndexed = useMemo(() => {
    return funders.map(funder => ({ ...funder, _lcName: funder.name.toLowerCase() }))
  }, [funders])

  const filteredFunders = useMemo(() => {
    const sel = (k: string) => (activeFilters[k] || []).map(o => o.id)
    const focusSel = sel('focus')
    const statusSel = sel('status')

    let result = fundersIndexed.filter(funder => {
      if (deferredSearch && !funder._lcName.includes(deferredSearch.toLowerCase())) return false

      const focusMatch = !focusSel.length || funder.focusAreas.some(f => focusSel.includes(String(f.id)))
      const statusMatch = !statusSel.length || statusSel.includes(funder.fundingStatus)

      return focusMatch && statusMatch
    })

    if (sortColumn && sortDirection) {
      const dir = sortDirection === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        if (sortColumn === 'name') {
          return dir * a.name.localeCompare(b.name)
        }
        if (sortColumn === 'amount') {
          const amountA = Number(a.amount) || 0
          const amountB = Number(b.amount) || 0
          return dir * (amountA - amountB)
        }
        if (sortColumn === 'status') {
          const sa = a.fundingStatus || ''
          const sb = b.fundingStatus || ''
          return dir * sa.localeCompare(sb)
        }
        if (sortColumn === 'dateAdded') {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dir * (da - db)
        }
        if (sortColumn === 'fundingEnd') {
          const da = a.fundingEnd ? new Date(a.fundingEnd).getTime() : 0
          const db = b.fundingEnd ? new Date(b.fundingEnd).getTime() : 0
          return dir * (da - db)
        }
        if (sortColumn === 'focusArea') {
          const sa = a.focusAreas.map(fa => fa.label).sort().join(', ')
          const sb = b.focusAreas.map(fa => fa.label).sort().join(', ')
          return dir * sa.localeCompare(sb)
        }
        return 0
      })
    }
    return result
  }, [fundersIndexed, deferredSearch, activeFilters, sortColumn, sortDirection])

  const FunderRow = useMemo(() => React.memo(function FunderRow({ funder }: { funder: FunderWithFocusAreas }) {
    return (
      <TableRow key={funder.id}>
        <TableCell className="p-3 w-1/3">
          <Link href={getFunderLink(funder.id)} className="font-medium" prefetch={false}>
            {funder.name}
          </Link>
        </TableCell>
        <TableCell className="p-3">
          <span className="text-nowrap">R{Number(funder.amount).toLocaleString()}</span>
        </TableCell>
        <TableCell className="p-3">
          <div className="flex items-center space-x-1">
            {funder.focusAreas.length > 0 ? (
              funder.focusAreas.map(fa => (
                <Badge
                  key={`funder-${funder.id}-focusArea-${fa.id}`}
                  variant="outline"
                  title={fa.label}
                  className="p-1"
                >
                  <DynamicIcon name={fa.icon} size={14} className="m-0" />
                </Badge>
              ))
            ) : (
              <span className="text-gray-500">All</span>
            )}
          </div>
        </TableCell>
        <TableCell className="p-3">
          {funder.fundingStatus && (
            <Badge 
              variant="outline" 
              className={`${
                funder.fundingStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                funder.fundingStatus === 'Paused' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                funder.fundingStatus === 'Cancelled' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {funder.fundingStatus}
            </Badge>
          )}
        </TableCell>
        <TableCell className="p-3">
          {funder.createdAt && format(new Date(funder.createdAt), 'MMM d, yyyy')}
        </TableCell>
        <TableCell className="p-3">
          {funder.fundingEnd && format(new Date(funder.fundingEnd), 'MMM d, yyyy')}
        </TableCell>
        {fundId && (
          <TableCell className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFunderToEdit(funder)} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit contribution
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 cursor-pointer"
                  onClick={() => setFunderToDelete(funder)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    )
  }), [getFunderLink, fundId])

  return (
    <>
      {fundId && (
        <h2 className="text-xl font-semibold mt-4">Contributing funders</h2>
      )}
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                type="search"
                id="search"
                placeholder="Filter funders..."
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
          <div className="flex gap-2">
            {fundId && fundName && allFunders && callback && (
              <>
                <LinkFunderDialog
                  fundId={fundId}
                  fundName={fundName}
                  availableFunders={allFunders}
                  callback={callback}
                />
                {funderToEdit && (
                  <LinkFunderDialog
                    fundId={fundId}
                    fundName={fundName}
                    funderId={funderToEdit.id}
                    funderName={funderToEdit.name}
                    editMode={true}
                    editingFund={{
                      id: fundId,
                      name: fundName,
                      fundAmount: funderToEdit.amount,
                      fundingStart: funderToEdit.fundingStart,
                      fundingEnd: funderToEdit.fundingEnd,
                      notes: funderToEdit.about
                    }}
                    open={!!funderToEdit} 
                    onOpenChange={(open: boolean) => !open && setFunderToEdit(null)}
                    callback={() => {
                      setFunderToEdit(null)
                      callback()
                    }}
                  />
                )}
              </>
            )}
            {callback && focusAreasData && provinces && (
              <FormDialog 
                focusAreas={focusAreasData}
                provinces={provinces}
                callback={callback} 
              />
            )}
          </div>
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
                    <TableHead className="h-12 cursor-pointer select-none px-3" onClick={() => handleSort('amount')}>
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
                    <TableHead className="h-12 cursor-pointer select-none px-3" onClick={() => handleSort('focusArea')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Focus areas</span>
                        <span className="ml-1">
                          {sortColumn === 'focusArea' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none px-3" onClick={() => handleSort('status')}>
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
                    <TableHead className="h-12 cursor-pointer select-none px-3" onClick={() => handleSort('dateAdded')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Date added</span>
                        <span className="ml-1">
                          {sortColumn === 'dateAdded' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none px-3" onClick={() => handleSort('fundingEnd')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Funding end</span>
                        <span className="ml-1">
                          {sortColumn === 'fundingEnd' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    {fundId && <TableHead className="h-12 w-12"></TableHead>}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredFunders.length > 0 ? (
                    filteredFunders.map(funder => <FunderRow key={funder.id} funder={funder} />)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={fundId ? 7 : 6} className="text-center py-8 text-gray-500">
                        No funders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {funders.length > 0 && (
        <p className="text-sm text-gray-500 pt-4">Showing {filteredFunders.length} of {funders.length} funders</p>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!funderToDelete} onOpenChange={(open) => !open && setFunderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>Remove funder</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{funderToDelete?.name}</strong> from this fund? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFunder}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}