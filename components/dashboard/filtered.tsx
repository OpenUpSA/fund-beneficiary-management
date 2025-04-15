"use client"

import { DashboardSection } from "@/components/dashboard/section"
import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion } from "@/components/ui/accordion"
import { useState } from "react"
import { availableDevelopmentStages, availableFocusAreas, availableFunders, availableFundingPeriods, availableLDAs, availableLocations, availableProgrammeOfficers, availableReportingStatuses, availableStatuses } from "@/app/data";

export const FilteredReport = () => {
  const [selectedLDAs, setSelectedLDAs] = useState<string[]>([])
  const [selectedDevelopmentStages, setSelectedDevelopmentStages] = useState<string[]>([])
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedFunders, setSelectedFunders] = useState<string[]>([])
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedProgrammeOfficers, setSelectedProgrammeOfficers] = useState<string[]>([])
  const [selectedReportingStatuses, setSelectedReportingStatuses] = useState<string[]>([])

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
              options={availableDevelopmentStages}
              value={selectedDevelopmentStages}
              onValueChange={(values: string[]) => setSelectedDevelopmentStages(values)}
              placeholder="All development stages"
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
              options={availableLocations}
              value={selectedLocations}
              onValueChange={(values: string[]) => setSelectedLocations(values)}
              placeholder="All locations"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={availableFunders}
              value={selectedFunders}
              onValueChange={(values: string[]) => setSelectedFunders(values)}
              placeholder="All funders"
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
          <div>
            <InputMultiSelect
              options={availableStatuses}
              value={selectedStatuses}
              onValueChange={(values: string[]) => setSelectedStatuses(values)}
              placeholder="All statuses"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={availableProgrammeOfficers}
              value={selectedProgrammeOfficers}
              onValueChange={(values: string[]) => setSelectedProgrammeOfficers(values)}
              placeholder="Any programme officers"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={availableReportingStatuses}
              value={selectedReportingStatuses}
              onValueChange={(values: string[]) => setSelectedReportingStatuses(values)}
              placeholder="Any reporting status"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          
        </div>
      </div>
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['funding', 'impact', 'process']}>
            <DashboardSection name="funding" title="Funding" />
            <DashboardSection name="impact" title="Impact" />
            <DashboardSection name="process" title="Process" />
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}