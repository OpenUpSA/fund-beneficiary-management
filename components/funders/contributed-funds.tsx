"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import React, { useCallback, useMemo, useState, useDeferredValue } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { DynamicIcon } from "@/components/dynamicIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LinkFunderDialog } from "@/components/funders/link-funder-dialog"
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
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { FundForFunder, FundFull } from "@/types/models";
import { FocusArea, FundStatus, FundType } from "@prisma/client";

type SortDirection = 'asc' | 'desc' | null
type SortableColumn = 'name' | 'amount' | 'status' | 'startDate' | 'endDate' | null

// Helper function to get display label for FundType
const getFundTypeLabel = (type: FundType): string => {
  return type === FundType.CORE_FUND ? 'Core' : 'Project'
}


interface ContributedFundsProps {
  fundFunders: FundForFunder[]
  funderId: number
  funderName: string
  availableFunds: FundFull[]
  focusAreas: FocusArea[]
  callback?: () => void
}

export const ContributedFunds: React.FC<ContributedFundsProps> = ({ 
  fundFunders, 
  funderId,
  funderName,
  availableFunds,
  focusAreas,
  callback 
}) => {
  const [sortColumn, setSortColumn] = useState<SortableColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})
  const [fundToEdit, setFundToEdit] = useState<FundForFunder | null>(null)
  const [fundToDelete, setFundToDelete] = useState<FundForFunder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Defer filtering while user types -> smoother input
  const deferredSearch = useDeferredValue(searchTerm)

  // Use FundStatus enum values for statuses
  const statuses = useMemo(() => 
    Object.values(FundStatus).map((status, idx) => ({ 
      id: idx, 
      label: status 
    }))
  , [])

  const fundTypes = useMemo(() => 
    Object.values(FundType).map((type, idx) => ({ 
      id: idx, 
      value: type,
      label: getFundTypeLabel(type)
    }))
  , [])

  const handleSort = useCallback((column: SortableColumn) => {
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
  }, [sortColumn, sortDirection])

  const SortIcon = useCallback(({ column }: { column: SortableColumn }) => {
    if (sortColumn !== column) {
      return <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="ml-2 h-4 w-4" />
      : <ChevronDownIcon className="ml-2 h-4 w-4" />
  }, [sortColumn, sortDirection])

  // Index fundFunders for faster searching
  const fundsIndexed = useMemo(() => {
    return fundFunders.map(ff => ({
      ...ff,
      searchText: `${ff.fund.name} ${ff.fund.focusAreas.map((fa: {label: string}) => fa.label).join(' ')}`.toLowerCase()
    }))
  }, [fundFunders])

  // Filter and sort
  const filteredFunds = useMemo(() => {
    let result = fundsIndexed

    // Text search
    if (deferredSearch) {
      const search = deferredSearch.toLowerCase()
      result = result.filter(ff => ff.searchText.includes(search))
    }

    // Filter by status
    if (activeFilters['status']?.length > 0) {
      const statusLabels = activeFilters['status'].map(s => s.label)
      result = result.filter(ff => statusLabels.includes(ff.fund.fundingStatus))
    }

    // Filter by fund type
    if (activeFilters['fundType']?.length > 0) {
      const typeValues = activeFilters['fundType'].map(t => t.value).filter((v): v is string => v !== undefined)
      result = result.filter(ff => typeValues.includes(ff.fund.fundType))
    }

    // Filter by focus area
    if (activeFilters['focusArea']?.length > 0) {
      const focusAreaIds = activeFilters['focusArea'].map((fa) => fa.id)
      result = result.filter(ff => 
        ff.fund.focusAreas.some((fa) => focusAreaIds.includes(fa.id))
      )
    }

    // Sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        let aVal: string | number
        let bVal: string | number

        switch (sortColumn) {
          case 'name':
            aVal = a.fund.name.toLowerCase()
            bVal = b.fund.name.toLowerCase()
            break
          case 'amount':
            aVal = Number(a.amount)
            bVal = Number(b.amount)
            break
          case 'status':
            aVal = a.fund.fundingStatus
            bVal = b.fund.fundingStatus
            break
          case 'startDate':
            aVal = new Date(a.fundingStart).getTime()
            bVal = new Date(b.fundingStart).getTime()
            break
          case 'endDate':
            aVal = new Date(a.fundingEnd).getTime()
            bVal = new Date(b.fundingEnd).getTime()
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [fundsIndexed, deferredSearch, activeFilters, sortColumn, sortDirection])

  // Filter change handlers
  const handleFilterChange = (filterType: string, selectedOptions: FilterOption[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: selectedOptions
    }))
  }

  const handleResetFilters = () => {
    setActiveFilters({})
  }

  const handleDeleteContribution = async () => {
    if (!fundToDelete) return

    setIsDeleting(true)
    const toastId = toast.loading('Removing contribution...')

    try {
      const response = await fetch(`/api/fund-funder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId: fundToDelete.fund.id,
          funderId: funderId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove contribution')
      }

      toast.success('Contribution removed successfully', { id: toastId })
      setFundToDelete(null)
      
      if (callback) {
        callback()
      }
    } catch (error) {
      console.error('Error removing contribution:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove contribution', { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter configurations
  const filterConfigs = useMemo(() => [
    {
      type: 'fundType',
      label: 'Fund type',
      options: fundTypes
    },
    {
      type: 'status',
      label: 'Status',
      options: statuses
    },
    {
      type: 'focusArea',
      label: 'Focus area',
      options: focusAreas.map(fa => ({ id: fa.id, label: fa.label }))
    }
  ], [fundTypes, statuses, focusAreas])

  const FundRow = useMemo(() => React.memo(function FundRow({ ff }: { ff: FundForFunder }) {
    return (
      <TableRow key={ff.id}>
        <TableCell className="p-3">
          <Link href={`/dashboard/funds/${ff.fund.id}/overview`} className="font-medium hover:underline">
            {ff.fund.name}
          </Link>
        </TableCell>
        <TableCell className="p-3">
          <Badge variant="outline">
            {getFundTypeLabel(ff.fund.fundType)}
          </Badge>
        </TableCell>
        <TableCell className="p-3">
          <span className="text-nowrap">R{Number(ff.amount).toLocaleString()}</span>
        </TableCell>
        <TableCell className="p-3">
          <Badge 
            variant="outline"
            className={
              ff.fund.fundingStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
              ff.fund.fundingStatus === 'Paused' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              ff.fund.fundingStatus === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-gray-50 text-gray-700 border-gray-200'
            }
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${
              ff.fund.fundingStatus === 'Active' ? 'bg-green-500' :
              ff.fund.fundingStatus === 'Paused' ? 'bg-yellow-500' :
              ff.fund.fundingStatus === 'Cancelled' ? 'bg-red-500' :
              'bg-gray-500'
            }`}></span>
            {ff.fund.fundingStatus}
          </Badge>
        </TableCell>
        <TableCell className="p-3">
          <div className="flex items-center space-x-1">
            {ff.fund.focusAreas.length > 0 ? (
              ff.fund.focusAreas.map(fa => (
                <Badge
                  key={`fund-${ff.fund.id}-focusArea-${fa.id}`}
                  variant="outline"
                  title={fa.label}
                  className="p-1"
                >
                  <DynamicIcon name={fa.icon} size={14} className="m-0" />
                </Badge>
              ))
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
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
              <DropdownMenuItem onClick={() => setFundToEdit(ff)} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Edit contribution
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer"
                onClick={() => setFundToDelete(ff)}
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
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Funds contributed to</h2>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                placeholder="Filter funds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
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
              funderId={funderId}
              funderName={funderName}
              availableFunds={availableFunds}
              callback={callback}
            />
            {fundToEdit && (
              <LinkFunderDialog
                funderId={funderId}
                funderName={funderName}
                fundId={fundToEdit.fund.id}
                fundName={fundToEdit.fund.name}
                editMode={true}
                editingFund={{
                  id: fundToEdit.fund.id,
                  name: fundToEdit.fund.name,
                  fundAmount: fundToEdit.amount,
                  fundingStart: fundToEdit.fundingStart,
                  fundingEnd: fundToEdit.fundingEnd,
                  notes: fundToEdit.notes
                }}
                open={!!fundToEdit}
                onOpenChange={(open: boolean) => !open && setFundToEdit(null)}
                callback={() => {
                  setFundToEdit(null)
                  callback?.()
                }}
              />
            )}
          </div>
        </div>

        <Card className="w-full">
          <CardContent className="p-0">
            <div className="h-[calc(100vh-450px)] min-h-[300px] overflow-y-auto">
              <Table className="text-xs w-full relative">
                <TableHeader className="bg-gray-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead 
                      className="p-3 cursor-pointer select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        <SortIcon column="name" />
                      </div>
                    </TableHead>
                    <TableHead className="p-3">Fund type</TableHead>
                    <TableHead 
                      className="p-3 cursor-pointer select-none"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center">
                        Contributed amount
                        <SortIcon column="amount" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="p-3 cursor-pointer select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon column="status" />
                      </div>
                    </TableHead>
                    <TableHead className="p-3">Focus areas</TableHead>
                    <TableHead 
                      className="p-3 cursor-pointer select-none"
                      onClick={() => handleSort('startDate')}
                    >
                      <div className="flex items-center">
                        Start date
                        <SortIcon column="startDate" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="p-3 cursor-pointer select-none"
                      onClick={() => handleSort('endDate')}
                    >
                      <div className="flex items-center">
                        End date
                        <SortIcon column="endDate" />
                      </div>
                    </TableHead>
                    <TableHead className="p-3"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredFunds.length > 0 ? (
                    filteredFunds.map(ff => <FundRow key={ff.id} ff={ff} />)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No funds found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-gray-500">
          Showing {filteredFunds.length} of {fundFunders.length} funds
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fundToDelete} onOpenChange={(open) => !open && setFundToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>Remove contribution</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to remove the contribution to <strong>{fundToDelete?.fund.name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContribution}
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
