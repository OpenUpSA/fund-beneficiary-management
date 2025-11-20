"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import React, { useCallback, useMemo, useState, useDeferredValue, startTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, MoreHorizontal, Pencil, Trash2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"
import { Funder } from '@prisma/client'
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
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
import { FunderForFund } from "@/types/models"

type SortDirection = 'asc' | 'desc' | null
type SortableColumn = 'name' | 'amount' | 'status' | 'startDate' | 'endDate' | null


interface FilteredFundFundersProps {
  fundFunders: FunderForFund[]
  fundId: number
  fundName: string
  allFunders: Funder[]
  callback?: () => void
}

export const FilteredFundFunders: React.FC<FilteredFundFundersProps> = ({ 
  fundFunders, 
  fundId, 
  fundName, 
  allFunders,
  callback 
}) => {
  const [sortColumn, setSortColumn] = useState<SortableColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})
  const [funderToEdit, setFunderToEdit] = useState<FunderForFund | null>(null)
  const [funderToDelete, setFunderToDelete] = useState<FunderForFund | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Defer filtering while user types -> smoother input
  const deferredSearch = useDeferredValue(searchTerm)

  const statusOptions = useMemo<FilterOption[]>(() => {
    const statuses = Array.from(new Set(fundFunders.map((ff) => ff.funder.fundingStatus)))
    return statuses.map((status) => ({ id: status, label: status }))
  }, [fundFunders])

  const filterConfigs = useMemo(() => ([
    { type: 'status', label: 'Status', options: statusOptions },
  ]), [statusOptions])

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
    if (!funderToDelete) return

    setIsDeleting(true)
    const toastId = toast.loading('Removing funder...')

    try {
      const response = await fetch(`/api/fund-funder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId: fundId,
          funderId: funderToDelete.funder.id
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

  // Precompute lowercase names for search once per array
  const fundersIndexed = useMemo(() => {
    return fundFunders.map(ff => ({ 
      ...ff, 
      searchText: ff.funder.name.toLowerCase()
    }))
  }, [fundFunders])

  const filteredFunders = useMemo(() => {
    const sel = (k: string) => (activeFilters[k] || []).map(o => o.id)
    const statusSel = sel('status')

    let result = fundersIndexed.filter(ff => {
      if (deferredSearch && !ff.searchText.includes(deferredSearch.toLowerCase())) return false

      const statusMatch = !statusSel.length || statusSel.includes(ff.funder.fundingStatus)

      return statusMatch
    })

    if (sortColumn && sortDirection) {
      const dir = sortDirection === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        if (sortColumn === 'name') {
          return dir * a.funder.name.localeCompare(b.funder.name)
        }
        if (sortColumn === 'amount') {
          const amountA = Number(a.amount) || 0
          const amountB = Number(b.amount) || 0
          return dir * (amountA - amountB)
        }
        if (sortColumn === 'status') {
          const sa = a.funder.fundingStatus || ''
          const sb = b.funder.fundingStatus || ''
          return dir * sa.localeCompare(sb)
        }
        if (sortColumn === 'startDate') {
          const da = a.fundingStart ? new Date(a.fundingStart).getTime() : 0
          const db = b.fundingStart ? new Date(b.fundingStart).getTime() : 0
          return dir * (da - db)
        }
        if (sortColumn === 'endDate') {
          const da = a.fundingEnd ? new Date(a.fundingEnd).getTime() : 0
          const db = b.fundingEnd ? new Date(b.fundingEnd).getTime() : 0
          return dir * (da - db)
        }
        return 0
      })
    }
    return result
  }, [fundersIndexed, deferredSearch, activeFilters, sortColumn, sortDirection])

  const FunderRow = useMemo(() => React.memo(function FunderRow({ ff }: { ff: FunderForFund }) {
    return (
      <TableRow key={ff.id}>
        <TableCell className="p-3 w-1/3">
          <Link href={`/dashboard/funders/${ff.funder.id}/overview`} className="font-medium hover:underline">
            {ff.funder.name}
          </Link>
        </TableCell>
        <TableCell className="p-3">
          <span className="text-nowrap">R{Number(ff.amount).toLocaleString()}</span>
        </TableCell>
        <TableCell className="p-3">
          {ff.funder.fundingStatus && (
            <Badge 
              variant="outline" 
              className={`${
                ff.funder.fundingStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                ff.funder.fundingStatus === 'Paused' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                ff.funder.fundingStatus === 'Cancelled' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {ff.funder.fundingStatus}
            </Badge>
          )}
        </TableCell>
        <TableCell className="p-3">
          {ff.fundingStart && format(new Date(ff.fundingStart), 'MMM d, yyyy')}
        </TableCell>
        <TableCell className="p-3">
          {ff.fundingEnd && format(new Date(ff.fundingEnd), 'MMM d, yyyy')}
        </TableCell>
        <TableCell className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFunderToEdit(ff)} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Edit contribution
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer"
                onClick={() => setFunderToDelete(ff)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }), [])

  return (
    <>
      <h2 className="text-xl font-semibold mt-4">Contributing funders</h2>
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
                funderId={funderToEdit.funder.id}
                funderName={funderToEdit.funder.name}
                editMode={true}
                editingFund={{
                  id: fundId,
                  name: fundName,
                  fundAmount: funderToEdit.amount,
                  fundingStart: funderToEdit.fundingStart,
                  fundingEnd: funderToEdit.fundingEnd,
                  notes: funderToEdit.notes
                }}
                open={!!funderToEdit} 
                onOpenChange={(open: boolean) => !open && setFunderToEdit(null)}
                callback={() => {
                  setFunderToEdit(null)
                  callback?.()
                }}
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
                    <TableHead className="h-12 cursor-pointer select-none px-3" onClick={() => handleSort('startDate')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">Start date</span>
                        <span className="ml-1">
                          {sortColumn === 'startDate' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none px-3" onClick={() => handleSort('endDate')}>
                      <div className="flex items-center justify-start">
                        <span className="font-medium">End date</span>
                        <span className="ml-1">
                          {sortColumn === 'endDate' && sortDirection !== null
                            ? (sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)
                            : <ChevronsUpDownIcon size={14} className="text-gray-400" />
                          }
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 w-12"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredFunders.length > 0 ? (
                    filteredFunders.map(ff => <FunderRow key={ff.id} ff={ff} />)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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

      {fundFunders.length > 0 && (
        <p className="text-sm text-gray-500 pt-4">Showing {filteredFunders.length} of {fundFunders.length} funders</p>
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
              Are you sure you want to remove <strong>{funderToDelete?.funder.name}</strong> from this fund? 
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
