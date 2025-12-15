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
import { buildReferrerUrl } from "@/lib/breadcrumb-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LinkLDADialog } from "@/components/funds/link-lda-dialog"
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
import { FundedLDAs } from "@/types/models"
import { FundLDAStatus } from "@prisma/client"

type SortDirection = 'asc' | 'desc' | null
type SortableColumn = 'name' | 'fund' | 'total' | 'status' | 'startDate' | 'endDate' | null


interface FilteredFundLDAsProps {
  fundedLDAs: FundedLDAs[]
  fundId?: number
  fundName?: string
  fundAmount?: number
  fundDefaultAmount?: number | null
  fundingCalculationType?: string
  availableLDAs?: { id: number; name: string }[]
  funds?: { id: number; label: string }[]
  callback?: () => void
  showLinkButton?: boolean
  referrerType?: 'fund' | 'funder' // Specify if links should include fund or funder as referrer
}

export const FilteredFundLDAs: React.FC<FilteredFundLDAsProps> = ({ 
  fundedLDAs, 
  fundId,
  fundName,
  // fundAmount,
  fundDefaultAmount,
  // fundingCalculationType,
  availableLDAs,
  funds,
  callback,
  showLinkButton = true,
  referrerType = 'fund'
}) => {
  const [sortColumn, setSortColumn] = useState<SortableColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})
  const [ldaToDelete, setLdaToDelete] = useState<FundedLDAs | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [ldaToEdit, setLdaToEdit] = useState<FundedLDAs | null>(null)

  // Defer filtering while user types -> smoother input
  const deferredSearch = useDeferredValue(searchTerm)

  // Calculate amounts based on fund's calculation type
  // const getTotalAmount = useCallback(() => {
  //   if (fundingCalculationType === 'total_funded_amount') {
  //     return fundedLDAs.length > 0 ? fundAmount / fundedLDAs.length : 0
  //   }
  //   return fundAmount
  // }, [fundAmount, fundingCalculationType, fundedLDAs.length])

  // const getMonthlyAmount = useCallback(() => {
  //   if (fundingCalculationType === 'lda_funding_per_month') {
  //     return fundAmount
  //   }
  //   // Calculate monthly from total if needed
  //   return 0
  // }, [fundAmount, fundingCalculationType])

  // Extract unique statuses from ldas
  const statuses = useMemo(() => 
    Object.values(FundLDAStatus).map((status, idx) => ({ 
      id: idx, 
      label: status as FundLDAStatus
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

  const getSortIcon = (column: SortableColumn) => {
    if (sortColumn !== column) {
      return <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
    }
    if (sortDirection === 'asc') {
      return <ChevronUpIcon className="ml-2 h-4 w-4" />
    }
    return <ChevronDownIcon className="ml-2 h-4 w-4" />
  }

  const filteredAndSortedLDAs = useMemo(() => {
    let result = [...fundedLDAs]

    // Apply search filter
    if (deferredSearch) {
      const searchLower = deferredSearch.toLowerCase()
      result = result.filter(fundedLDA =>
        fundedLDA.localDevelopmentAgency.name.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    const statusFilter = activeFilters['status']
    if (statusFilter && statusFilter.length > 0) {
      const selectedStatuses = statusFilter.map(f => f.label.toLowerCase().replace(' ', '_'))
      result = result.filter(fundedLDA => 
        selectedStatuses.includes(fundedLDA.fundingStatus.toLowerCase())
      )
    }

    // Apply fund filter
    const fundFilter = activeFilters['fund']
    if (fundFilter && fundFilter.length > 0) {
      const selectedFundIds = fundFilter.map(f => f.id)
      result = result.filter(fundedLDA => 
        fundedLDA.fundId && selectedFundIds.includes(fundedLDA.fundId)
      )
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: string | number | Date
        let bValue: string | number | Date

        switch (sortColumn) {
          case 'name':
            aValue = a.localDevelopmentAgency.name.toLowerCase()
            bValue = b.localDevelopmentAgency.name.toLowerCase()
            break
          case 'fund':
            aValue = a.fund.name.toLowerCase()
            bValue = b.fund.name.toLowerCase()
            break
          case 'total':
            aValue = a.amount ? Number(a.amount) : 0
            bValue = b.amount ? Number(b.amount) : 0
            break
          case 'status':
            aValue = a.fundingStatus.toLowerCase()
            bValue = b.fundingStatus.toLowerCase()
            break
          case 'startDate':
            aValue = new Date(a.fundingStart).getTime()
            bValue = new Date(b.fundingStart).getTime()
            break
          case 'endDate':
            aValue = new Date(a.fundingEnd).getTime()
            bValue = new Date(b.fundingEnd).getTime()
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [fundedLDAs, deferredSearch, sortColumn, sortDirection, activeFilters])

  const filterConfigs = useMemo(() => {
    const configs: Array<{
      type: string
      label: string
      options: Array<{ id: number; label: string }>
    }> = [
      {
        type: 'status',
        label: 'Status',
        options: statuses
      }
    ]
    
    // Only add fund filter if funds are provided
    if (funds && funds.length > 0) {
      configs.unshift({
        type: 'fund',
        label: 'Fund',
        options: funds
      })
    }
    
    return configs
  }, [statuses, funds])

  const handleFilterChange = (filterId: string, selectedOptions: FilterOption[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: selectedOptions
    }))
  }

  const handleResetFilters = () => {
    setActiveFilters({})
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <span className="mr-1">▶</span> Active
        </Badge>
      case 'paused':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Paused
        </Badge>
      case 'cancelled':
        return <Badge variant="default" className="bg-red-100 text-red-800 hover:bg-red-100">
          Cancelled
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDeleteFunding = async () => {
    if (!ldaToDelete) return

    setIsDeleting(true)
    const toastId = toast.loading('Removing funding...')

    try {
      const response = await fetch(`/api/fund-lda`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId: ldaToDelete.fundId || fundId,
          ldaId: ldaToDelete.localDevelopmentAgency.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove funding')
      }

      toast.success('Funding removed successfully', { id: toastId })
      setLdaToDelete(null)
      
      // Call callback to refresh data
      if (callback) {
        await callback()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove funding'
      toast.error(message, { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold mt-4">LDAs receiving funds</h2>
      
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
          {showLinkButton && availableLDAs && (
            <div className="flex gap-2">
              {/* Dialog for creating new LDA link */}
              <LinkLDADialog
                fundId={fundId || 0}
                fundName={fundName}
                fundDefaultAmount={fundDefaultAmount}
                availableLDAs={availableLDAs}
                callback={callback}
              />
            </div>
          )}
          
          {/* Dialog for editing existing LDA link - outside showLinkButton condition */}
          {ldaToEdit && availableLDAs && (
            <LinkLDADialog
              fundId={ldaToEdit.fundId}
              fundName={ldaToEdit.fund.name}
              fundDefaultAmount={fundDefaultAmount}
              availableLDAs={availableLDAs}
              editingLDA={ldaToEdit}
              open={!!ldaToEdit}
              onOpenChange={(open: boolean) => !open && setLdaToEdit(null)}
              callback={() => {
                setLdaToEdit(null)
                callback?.()
              }}
            />
          )}
        </div>

        <Card className="w-full">
          <CardContent className="p-0">
            <div className="h-[calc(100vh-650px)] min-h-[300px] overflow-y-auto">
              <Table className="text-xs w-full relative">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="h-12 cursor-pointer select-none w-1/4 pl-3" onClick={() => handleSort('name')}>
                      <div className="flex items-center justify-start">
                        <span>Name</span>
                        {getSortIcon('name')}
                      </div>
                    </TableHead>
                    {funds && funds.length > 0 && (
                      <TableHead className="h-12 cursor-pointer select-none" onClick={() => handleSort('fund')}>
                        <div className="flex items-center justify-start">
                          <span>Funded by</span>
                          {getSortIcon('fund')}
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="h-12 cursor-pointer select-none" onClick={() => handleSort('total')}>
                      <div className="flex items-center justify-start">
                        <span>Amount</span>
                        {getSortIcon('total')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center justify-start">
                        <span>Status</span>
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none" onClick={() => handleSort('startDate')}>
                      <div className="flex items-center justify-start">
                        <span>Start date</span>
                        {getSortIcon('startDate')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 cursor-pointer select-none" onClick={() => handleSort('endDate')}>
                      <div className="flex items-center justify-start">
                        <span>End date</span>
                        {getSortIcon('endDate')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedLDAs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={funds && funds.length > 0 ? 7 : 6} className="h-24 text-center text-muted-foreground">
                        No LDAs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedLDAs.map((fundedLDA) => (
                      <TableRow key={fundedLDA.id}>
                        <TableCell className="p-3 font-medium">
                          <Link 
                            href={
                              fundId && fundName
                                ? buildReferrerUrl(`/dashboard/ldas/${fundedLDA.localDevelopmentAgency.id}/overview`, {
                                    type: referrerType,
                                    id: fundId,
                                    name: fundName
                                  })
                                : `/dashboard/ldas/${fundedLDA.localDevelopmentAgency.id}/overview`
                            }
                            className="hover:underline"
                          >
                            {fundedLDA.localDevelopmentAgency.name}
                          </Link>
                        </TableCell>
                        {funds && funds.length > 0 && (
                          <TableCell className="p-3">
                            {fundedLDA.fund.name}
                          </TableCell>
                        )}
                        <TableCell className="p-3">
                          R{fundedLDA?.amount ? Number(fundedLDA.amount).toLocaleString() : 0}
                        </TableCell>
                        <TableCell className="p-3">
                          {getStatusBadge(fundedLDA.fundingStatus)}
                        </TableCell>
                        <TableCell className="p-3">
                          {format(new Date(fundedLDA.fundingStart), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="p-3">
                          {format(new Date(fundedLDA.fundingEnd), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLdaToEdit(fundedLDA)}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit funding
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer"
                                onClick={() => setLdaToDelete(fundedLDA)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedLDAs.length} of {fundedLDAs.length} LDAs
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!ldaToDelete} onOpenChange={(open) => !open && setLdaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to remove the funding for <strong>{ldaToDelete?.localDevelopmentAgency.name}</strong> from <strong>{ldaToDelete?.fund.name}</strong>?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFunding}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
