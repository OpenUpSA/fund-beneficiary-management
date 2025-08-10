"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { FocusArea, LocalDevelopmentAgency } from "@prisma/client"
import { FormDialog as MediaFormDialog } from "@/components/media/form"
import { MediaTypeEnum } from "@/types/formSchemas"

import { ImageKitProvider } from '@imagekit/next'

import ImageWithFallback from '@/components/imageWithFallback'
import { MediaFull } from "@/types/models"
import { useTranslations } from "next-intl"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"


interface Props {
  media: MediaFull[],
  lda?: LocalDevelopmentAgency,
  dataChanged: () => void
  navigatedFrom?: string
}

export function FilteredMedia({ media, dataChanged, lda, navigatedFrom }: Props) {
  const tC = useTranslations('common')

  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})

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

  const filterConfigs = [
    !lda ? { type: 'lda', label: 'LDA', options: ldaOptions } : null,
    { type: 'type', label: 'Type', options: mediaTypeOptions },
    !lda ? { type: 'focus', label: 'Focus areas', options: focusAreaOptions } : null,
    !lda ? { type: 'period', label: 'Funding period', options: periodOptions } : null,
  ].filter(Boolean) as { type: string, label: string, options: FilterOption[] }[]

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

      return focusAreaMatch && searchMatch && selectedMediaTypeMatch && fundingPeriodMatch && ldaMatch
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
        {lda && (
          <MediaFormDialog lda={lda} callback={dataChanged} />
        )}
      </div>

      <Card className="w-full">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <span>All Media</span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 p-5 grid-cols-2 md:gap-5 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          <ImageKitProvider urlEndpoint={imagekitUrlEndpoint}>
            {filteredMedia.map((item) => (
              <Link className="block w-full" key={item.id} href={getMediaLink(item.id)} title={item.title}>
                <ImageWithFallback
                  src={item.filePath}
                  transformation={[{ width: 140, height: 101, quality: 75, format: 'webp' }]}
                  responsive={false}
                  width={140}
                  height={101}
                  alt={item.title}
                  fallbackSrc="/thumbnail.png"
                  className="border"
                />
              </Link>
            ))}
          </ImageKitProvider>
        </CardContent>
      </Card>
    </div>
  )
}