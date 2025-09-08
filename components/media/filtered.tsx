"use client"

import { Input } from "@/components/ui/input"
import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { FocusArea, LocalDevelopmentAgency, MediaSourceType } from "@prisma/client"
import { FormDialog as MediaFormDialog } from "@/components/media/form"
import { DeleteDialog } from "@/components/media/delete"
import { MediaTypeEnum } from "@/types/formSchemas"

import { ImageKitProvider } from '@imagekit/next'
import { InfoIcon, MoreHorizontal, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import ImageWithFallback from '@/components/imageWithFallback'
import { MediaFull, UserWithLDAsBasic } from "@/types/models"
import { useTranslations } from "next-intl"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { CustomDateFilter } from "@/components/ui/date-range-picker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { InitialsBadge } from "@/components/ui/initials-badge"


interface Props {
  media: MediaFull[],
  lda?: LocalDevelopmentAgency,
  dataChanged: (media_id?: string) => void
  navigatedFrom?: string
  mediaSourceTypes?: MediaSourceType[]
  users?: UserWithLDAsBasic[]
}

export function FilteredMedia({ media, dataChanged, lda, navigatedFrom, mediaSourceTypes, users }: Props) {
  const tC = useTranslations('common')

  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})
  const [viewMode, setViewMode] = useState<'thumbnail' | 'table'>('thumbnail')

  const imagekitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!

  const availableMediaTypes = MediaTypeEnum.options.map((type) => ({
    id: type,
    label: tC(`mediaTypesPlural.${type}`),
  }))

  const getMediaLink = (mediaId: number): string => {
    return navigatedFrom
      ? `/dashboard/media/${mediaId}?from=${navigatedFrom}`
      : `/dashboard/media/${mediaId}`;
  }

  let availableLDAs: { id: string; label: string }[] = []
  let focusAreas: FocusArea[] = []
  let availableFundingPeriods: { id: string; label: string }[] = []

  if (!lda) {
    availableLDAs = [
      ...new Map(
        media
          .map((item) => item.localDevelopmentAgency)
          .map((agency) => [agency.id, { id: String(agency.id), label: agency.name }])
      ).values(),
    ]

    focusAreas = [
      ...new Map(
        media.flatMap(m =>
          m.localDevelopmentAgency.focusAreas.map(fa => [fa.id, fa] as unknown as [string, FocusArea])
        )
      ).values(),
    ]

    const years = new Set<number>()

    media.forEach((media) => {
      if (media.localDevelopmentAgency.fundingStart) years.add(new Date(media.localDevelopmentAgency.fundingStart).getFullYear())
      if (media.localDevelopmentAgency.fundingEnd) years.add(new Date(media.localDevelopmentAgency.fundingEnd).getFullYear())
    })

    availableFundingPeriods = Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => ({ id: String(year), label: String(year) }))
  }

  const ldaOptions: FilterOption[] = availableLDAs.map(({ id, label }) => ({ id, label }))
  const focusAreaOptions: FilterOption[] = focusAreas.map(({ id, label }) => ({ id: String(id), label }))
  const mediaTypeOptions: FilterOption[] = availableMediaTypes.map(({ id, label }) => ({ id, label }))
  const periodOptions: FilterOption[] = availableFundingPeriods.map(({ id, label }) => ({ id, label }))

  // Date created filter options
  const dateCreatedOptions: FilterOption[] = useMemo(() => [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7days', label: 'Last 7 days' },
    { id: 'last30days', label: 'Last 30 days' },
    { id: 'thisMonth', label: 'This month' },
    { id: 'lastMonth', label: 'Last month' },
    { id: 'custom', label: 'Custom range' },
  ], [])

  // Create options for createdBy filter from users
  const createdByOptions: FilterOption[] = users?.map(user => ({ 
    id: String(user.id), 
    label: user.name || user.email || 'Unknown user' 
  })) || []

  const filterConfigs = [
    !lda ? { type: 'lda', label: 'LDA', options: ldaOptions } : null,
    { type: 'type', label: 'Type', options: mediaTypeOptions },
    { type: 'sourceType', label: 'Source', options: mediaSourceTypes?.map(({ id, title }) => ({ id: String(id), label: title })) },
    !lda ? { type: 'focus', label: 'Focus areas', options: focusAreaOptions } : null,
    !lda ? { type: 'period', label: 'Funding period', options: periodOptions } : null,
    { 
      type: 'dateCreated', 
      label: 'Date added', 
      options: dateCreatedOptions,
      customFilterComponent: CustomDateFilter
    },
    { type: 'createdBy', label: 'Uploaded by', options: createdByOptions },
  ].filter(Boolean) as { 
    type: string, 
    label: string, 
    options: FilterOption[],
    customFilterComponent?: React.ComponentType<{ filterType: string, onFilterChange: (filterType: string, selectedOptions: FilterOption[]) => void, activeFilters: Record<string, FilterOption[]> }>
  }[]
  const handleSearch = (term: string) => setSearchTerm(term)

  const handleFilterChange = useCallback((filterType: string, selectedOptions: FilterOption[]) => {
    setActiveFilters({
      ...activeFilters,
      [filterType]: selectedOptions,
    })
  }, [activeFilters])

  const handleResetFilters = () => {
    setSearchTerm("")
    setActiveFilters({})
    setFilteredMedia(media)
  }

  const [filteredMedia, setFilteredMedia] = useState<MediaFull[]>(media)

  useEffect(() => {
    const filtered = media.filter((item) => {
      const selectedLdaIds = (activeFilters['lda'] || []).map(o => o.id)
      const selectedTypes = (activeFilters['type'] || []).map(o => o.id)
      const selectedFocusIds = (activeFilters['focus'] || []).map(o => o.id)
      const selectedPeriods = (activeFilters['period'] || []).map(o => o.id)
      const selectedSourceTypeIds = (activeFilters['sourceType'] || []).map(o => o.id)
      const selectedDateRanges = (activeFilters['dateCreated'] || [])
      const selectedCreatedByIds = (activeFilters['createdBy'] || []).map(o => o.id)

      const ldaMatch = selectedLdaIds.length === 0 || selectedLdaIds.includes(String(item.localDevelopmentAgencyId))

      const focusAreaMatch =
        selectedFocusIds.length === 0 ||
        item.localDevelopmentAgency.focusAreas.some((fa) => selectedFocusIds.includes(String(fa.id)))

      const selectedMediaTypeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(item.mediaType)

      const searchMatch =
        searchTerm.trim() === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())

      let fundingPeriodMatch = true
      if (!lda) {
        const agency = item.localDevelopmentAgency
        const fundingStartYear = agency?.fundingStart ? new Date(agency.fundingStart).getFullYear() : null
        const fundingEndYear = agency?.fundingEnd ? new Date(agency.fundingEnd).getFullYear() : null
        fundingPeriodMatch =
          selectedPeriods.length === 0 ||
          (fundingStartYear !== null && selectedPeriods.includes(String(fundingStartYear))) ||
          (fundingEndYear !== null && selectedPeriods.includes(String(fundingEndYear)))
      }

      const sourceMatch = selectedSourceTypeIds.length === 0 || selectedSourceTypeIds.includes(String(item.mediaSourceTypeId))

      // Date created filter logic
      let dateCreatedMatch = true
      if (selectedDateRanges.length > 0) {
        const createdAt = new Date(item.createdAt)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        const lastWeekDate = new Date(today)
        lastWeekDate.setDate(lastWeekDate.getDate() - 7)
        
        const lastMonthDate = new Date(today)
        lastMonthDate.setDate(lastMonthDate.getDate() - 30)
        
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastDayOfLastMonth = new Date(firstDayOfMonth)
        lastDayOfLastMonth.setDate(lastDayOfLastMonth.getDate() - 1)
        const firstDayOfLastMonth = new Date(lastDayOfLastMonth.getFullYear(), lastDayOfLastMonth.getMonth(), 1)
        dateCreatedMatch = selectedDateRanges.some(range => {
          // Handle custom date range
          if (range.id === 'customRange' || (typeof range === 'object' && range.id === 'customRange' && range.from && range.to)) {
            const from = range.from ? new Date(range.from) : new Date()
            const to = range.to ? new Date(range.to) : new Date()
            // Set to end of day for the end date
            to.setHours(23, 59, 59, 999)
            return createdAt >= from && createdAt <= to
          }
          
          // Handle predefined ranges
          switch (range.id) {
            case 'today':
              return createdAt >= today
            case 'yesterday':
              return createdAt >= yesterday && createdAt < today
            case 'last7days':
              return createdAt >= lastWeekDate
            case 'last30days':
              return createdAt >= lastMonthDate
            case 'thisMonth':
              return createdAt >= firstDayOfMonth
            case 'lastMonth':
              return createdAt >= firstDayOfLastMonth && createdAt < firstDayOfMonth
            default:
              return true
          }
        })
      }

      // Created by filter match
      const createdByMatch = selectedCreatedByIds.length === 0 || 
        (item.createdById && selectedCreatedByIds.includes(String(item.createdById)))

      return focusAreaMatch && searchMatch && selectedMediaTypeMatch && fundingPeriodMatch && ldaMatch && sourceMatch && dateCreatedMatch && createdByMatch
    })

    setFilteredMedia(filtered)
  }, [activeFilters, searchTerm, media, lda])

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              type="search"
              id="search"
              placeholder="Filter media..."
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
          />
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'thumbnail' ? 'table' : 'thumbnail')}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            <span>View</span>
          </Button>
          {lda && (
            <MediaFormDialog lda={lda} callback={dataChanged} mediaSourceTypes={mediaSourceTypes}/>
          )}
        </div>
      </div>

      <div className="w-full">
        {viewMode === 'thumbnail' ? (
          <div className="grid gap-6 py-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <ImageKitProvider urlEndpoint={imagekitUrlEndpoint}>
              {filteredMedia.length > 0 ? filteredMedia.map((item) => (
                <div key={item.id} className="relative group border rounded-md overflow-hidden flex flex-col">
                  <div className="p-2 flex items-center">
                    <span className="text-xs text-slate-900 font-medium truncate flex-grow" title={item.filePath.split('/').pop() || item.title}>
                      {item.filePath.split('/').pop() || `${item.title}.jpg`}
                    </span>
                    <div className="flex items-center ml-auto">
                      {item.description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <InfoIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[20rem]">
                              {item.description}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <MediaFormDialog
                              key={item.id}
                              media={item}
                              callback={dataChanged}
                              mediaSourceTypes={mediaSourceTypes}
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <DeleteDialog media={item} callback={dataChanged} />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <Link className="block flex-grow pt-2 p-3" href={getMediaLink(item.id)} title={item.title}>
                    <div className="relative aspect-[4/3] w-full">
                      <ImageWithFallback
                        src={item.filePath}
                        transformation={[{ width: 300, height: 225, quality: 75, format: 'webp' }]}
                        responsive={true}
                        fill
                        style={{ objectFit: 'cover' }}
                        alt={item.title}
                        fallbackSrc="/thumbnail.png"
                        className="transition-transform group-hover:scale-105 rounded-md"
                      />
                    </div>
                  </Link>
                </div>
              )) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No media found
                </div>
              )}
            </ImageKitProvider>
          </div>
        ) : (
          <Card className="w-full text-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>info</TableHead>
                    <TableHead>Uploaded by</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedia.length > 0 ? (
                    filteredMedia.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <Link href={getMediaLink(item.id)} className="flex items-center space-x-2">
                            <span>{item.title}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{tC(`mediaTypes.${item.mediaType}`)}</TableCell>
                        <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{item.mediaSourceType?.title || '-'}</TableCell>
                        <TableCell>
                          {item.description && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                    <InfoIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[20rem]">
                                  {item.description}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.createdBy?.name ? (
                            <InitialsBadge 
                              name={item.createdBy.name} 
                              title={item.createdBy.name} 
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <MediaFormDialog
                                  key={item.id}
                                  media={item}
                                  callback={dataChanged}
                                  mediaSourceTypes={mediaSourceTypes}
                                />
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <DeleteDialog media={item} callback={dataChanged} />
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No media found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}