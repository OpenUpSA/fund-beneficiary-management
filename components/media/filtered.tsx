"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect";
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import Link from "next/link";
import { allMedia, availableMediaTypes, availableFocusAreas, availableFundingPeriods, availableLDAs } from "@/app/data";

export const FilteredMedia = () => {
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<string[]>([])
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([])
  const [selectedLDAs, setSelectedLDAs] = useState<string[]>([])

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
              className="bg-white dark:bg-black" />
          </div>
          <div>
            <InputMultiSelect
              options={availableLDAs}
              value={selectedLDAs}
              onValueChange={(values: string[]) => setSelectedLDAs(values)}
              placeholder="All LDAs"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={availableMediaTypes}
              value={selectedMediaTypes}
              onValueChange={(values: string[]) => setSelectedMediaTypes(values)}
              placeholder="All media types"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={availableFocusAreas}
              value={selectedFocusAreas}
              onValueChange={(values: string[]) => setSelectedFocusAreas(values)}
              placeholder="All focus areas"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={availableFundingPeriods}
              value={selectedFundingPeriods}
              onValueChange={(values: string[]) => setSelectedFundingPeriods(values)}
              placeholder="All funding periods"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          
        </div>
      </div>
      <Card className="w-full">
        <CardContent className="grid gap-2 p-5 grid-cols-2 md:gap-5 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">

          {allMedia.map((media) => (
            <Link className="block w-full" key={media.id} href={`/dashboard/media/${media.id}`} title={media.title}>
              <img src="/images/media/thumbnail.png" width="100%" height="101" alt={media.title} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div >
  )
}