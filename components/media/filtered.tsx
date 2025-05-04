"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useEffect, useState } from "react"
import Link from "next/link"
import { FocusArea, LocalDevelopmentAgency } from "@prisma/client"
import { FormDialog as MediaFormDialog } from "@/components/media/form"
import { MediaTypeEnum } from "@/types/formSchemas"

import { ImageKitProvider } from '@imagekit/next'

import ImageWithFallback from '@/components/imageWithFallback'
import { MediaFull } from "@/types/models"
import { useTranslations } from "next-intl"


interface Props {
  media: MediaFull[],
  lda?: LocalDevelopmentAgency,
  dataChanged: () => void
}

export function FilteredMedia({ media, dataChanged, lda }: Props) {
  const tC = useTranslations('common')

  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<number[]>([])
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([])
  const [selectedLDAs, setSelectedLDAs] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const imagekitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!

  const availableMediaTypes = MediaTypeEnum.options.map((type) => ({
    id: type,
    label: tC(`mediaTypesPlural.${type}`),
  }))

  let availableLDAs: { id: string; label: string }[] = []
  let focusAreas: FocusArea[] = []
  let availableFundingPeriods: { value: string; label: string }[] = [];

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
      .map((year) => ({ value: String(year), label: String(year) }))
  }

  const [filteredMedia, setFilteredMedia] = useState<MediaFull[]>(media)

  useEffect(() => {
    const filtered = media.filter((item) => {

      const focusAreaMatch =
        selectedFocusAreas.length === 0 ||
        item.localDevelopmentAgency.focusAreas.some((focusArea) =>
          selectedFocusAreas.includes(String(focusArea.id))
        )

      const selectedMediaTypeMatch =
        selectedMediaTypes.length === 0 ||
        selectedMediaTypes.includes(item.mediaType)

      const searchMatch =
        searchTerm.trim() === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())

      let fundingPeriodMatch = true

      if (!lda) {
        const agency = item.localDevelopmentAgency

        const fundingStartYear = agency?.fundingStart
          ? new Date(agency.fundingStart).getFullYear()
          : null

        const fundingEndYear = agency?.fundingEnd
          ? new Date(agency.fundingEnd).getFullYear()
          : null

        fundingPeriodMatch =
          selectedFundingPeriods.length === 0 ||
          (fundingStartYear !== null && selectedFundingPeriods.includes(fundingStartYear)) ||
          (fundingEndYear !== null && selectedFundingPeriods.includes(fundingEndYear))
      }

      const ldaMatch =
        selectedLDAs.length === 0 ||
        (selectedLDAs.includes(String(item.localDevelopmentAgencyId)))

      return focusAreaMatch && searchMatch && selectedMediaTypeMatch && fundingPeriodMatch && ldaMatch
    })

    setFilteredMedia(filtered)
  }, [selectedFocusAreas, searchTerm, selectedMediaTypes, selectedFundingPeriods, selectedLDAs, media, lda])

  return (
    <div className="sm:flex sm:space-x-4 mt-4">
      <div className="sm:w-80">
        <h2 className="font-semibold text-sm mb-1">Filters</h2>
        <div className="space-y-2">
          <div>
            <Input
              type="search"
              id="search"
              placeholder="Search..."
              className="bg-white dark:bg-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {!lda && <div>
            <InputMultiSelect
              options={availableLDAs.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedLDAs}
              onValueChange={(values: string[]) => setSelectedLDAs(values)}
              placeholder="All LDAs"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>}
          <div>
            <InputMultiSelect
              options={availableMediaTypes.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedMediaTypes}
              onValueChange={(values: string[]) => setSelectedMediaTypes(values)}
              placeholder="All media types"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          {!lda && <div>
            <InputMultiSelect
              options={focusAreas.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedFocusAreas}
              onValueChange={(values: string[]) => setSelectedFocusAreas(values)}
              placeholder="All focus areas"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>}
          {!lda && <div>
            <InputMultiSelect
              options={availableFundingPeriods}
              value={selectedFundingPeriods.map(String)}
              onValueChange={(values: string[]) => setSelectedFundingPeriods(values.map(Number))}
              placeholder="All funding periods"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>}
        </div>
      </div>
      <Card className="w-full">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <span>All Media</span>
            <div>
              {lda && <MediaFormDialog
                lda={lda}
                callback={dataChanged} />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 p-5 grid-cols-2 md:gap-5 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          <ImageKitProvider urlEndpoint={imagekitUrlEndpoint}>
            {filteredMedia.map((item) => (
              <Link className="block w-full" key={item.id} href={`/dashboard/media/${item.id}`} title={item.title}>
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
    </div >
  )
}