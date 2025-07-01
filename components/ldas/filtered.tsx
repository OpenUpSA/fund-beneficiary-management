"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { AlertTriangleIcon, Clock3Icon } from "lucide-react"
import { Badge } from "../ui/badge"
import Link from "next/link"
import { availableReportingStatuses } from "@/app/data"
import { LocalDevelopmentAgencyFull } from "@/types/models"
import { FocusArea, FundingStatus, Location, DevelopmentStage } from "@prisma/client"
import { DynamicIcon } from "../dynamicIcon"

const getInitials = (name: string) =>
  name.split(" ").map(word => word[0]).join("")

interface FilteredLDAsProps {
  ldas: LocalDevelopmentAgencyFull[]
  navigatedFrom?: string
}

export const FilteredLDAs: React.FC<FilteredLDAsProps> = ({ ldas, navigatedFrom }) => {

  const [selectedDevelopmentStages, setSelectedDevelopmentStages] = useState<string[]>([])
  const [selectedReportingStatuses, setSelectedReportingStatuses] = useState<string[]>([])
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])
  const [selectedFundingStatuses, setSelectedFundingStatuses] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedFunders, setSelectedFunders] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Extract all unique funders from the funds' funders arrays
  const funders = [...new Map(
    ldas.flatMap(lda =>
      lda.funds.flatMap(fund =>
        fund.funders.map((funder: { id: number; name: string }) =>
          [funder.id, { id: funder.id, label: funder.name }]
        )
      )
    )
  ).values()]

  const fundingStatuses: FundingStatus[] = Array.from(
    new Map(ldas.flatMap((lda) => lda.fundingStatus || []).map((item) => [item.id, item])).values()
  )

  const focusAreas: FocusArea[] = [
    ...new Map(
      ldas.flatMap((lda) => lda.focusAreas || []).map((item) => [item.id, item])
    ).values(),
  ]

  const locations: Location[] = Array.from(
    new Map(ldas.flatMap((lda) => lda.location || []).map((item) => [item.id, item])).values()
  )

  const developmentStages: DevelopmentStage[] = Array.from(
    new Map(ldas.flatMap((lda) => lda.developmentStage || []).map((item) => [item.id, item])).values()
  )

  const years = new Set<number>()

  ldas.forEach((lda) => {
    if (lda.fundingStart) years.add(new Date(lda.fundingStart).getFullYear())
    if (lda.fundingEnd) years.add(new Date(lda.fundingEnd).getFullYear())
  })

  const [filteredLDAs, setFilteredLDAs] = useState<LocalDevelopmentAgencyFull[]>(ldas)

  const getLDAlink = (ldaid: number): string => {
    return navigatedFrom
      ? `/dashboard/ldas/${ldaid}?from=${navigatedFrom}`
      : `/dashboard/ldas/${ldaid}`;
  }

  useEffect(() => {
    const filtered = ldas.filter((lda) => {
      const funderMatch =
        selectedFunders.length === 0 ||
        lda.funds.some((fund) =>
          fund.funders.some((funder: { id: number }) => selectedFunders.includes(String(funder.id)))
        )

      const focusAreaMatch =
        selectedFocusAreas.length === 0 ||
        lda.focusAreas.some((focusArea) =>
          selectedFocusAreas.includes(String(focusArea.id))
        )

      const locationMatch =
        selectedLocations.length === 0 ||
        selectedLocations.includes(String(lda.locationId))

      const developmentStageMatch =
        selectedDevelopmentStages.length === 0 ||
        selectedDevelopmentStages.includes(String(lda.developmentStageId))

      const fundingStatusMatch =
        selectedFundingStatuses.length === 0 ||
        selectedFundingStatuses.includes(String(lda.fundingStatusId))

      const searchMatch =
        searchTerm.trim() === "" ||
        lda.name.toLowerCase().includes(searchTerm.toLowerCase())

      return focusAreaMatch && fundingStatusMatch && searchMatch && locationMatch && funderMatch && developmentStageMatch
    })

    setFilteredLDAs(filtered)
  }, [selectedFocusAreas, selectedFundingStatuses, searchTerm, selectedLocations, selectedFunders, selectedDevelopmentStages, ldas])

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
          <div>
            <InputMultiSelect
              options={fundingStatuses.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedFundingStatuses}
              onValueChange={(values: string[]) => setSelectedFundingStatuses(values)}
              placeholder="All funding statuses"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={locations.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedLocations}
              onValueChange={(values: string[]) => setSelectedLocations(values)}
              placeholder="All locations"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={developmentStages.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedDevelopmentStages}
              onValueChange={(values: string[]) => setSelectedDevelopmentStages(values)}
              placeholder="All development stages"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={focusAreas.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedFocusAreas}
              onValueChange={(values: string[]) => setSelectedFocusAreas(values)}
              placeholder="All focus areas"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          <div>
            <InputMultiSelect
              options={funders.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedFunders}
              onValueChange={(values: string[]) => setSelectedFunders(values)}
              placeholder="All funders"
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
        <CardContent>
          <Table className="text-xs w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Province</TableHead>
                <TableHead className="text-nowrap">Focus Areas</TableHead>
                <TableHead>Funders</TableHead>
                <TableHead>Reporting</TableHead>
                <TableHead><abbr title="Programme Officer">PO</abbr></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLDAs.map((lda) => (
                <TableRow key={lda.id}>
                  <TableCell>
                    <Link href={getLDAlink(lda.id)}>
                      {lda.name}
                    </Link>
                  </TableCell>
                  <TableCell>{lda.fundingStatus && <Badge variant="outline">{lda.fundingStatus.label}</Badge>}</TableCell>
                  <TableCell className="text-nowrap">{lda.amount && `R${Number(lda.amount)}`}</TableCell>
                  <TableCell>{lda.developmentStage && <Badge variant="outline">{lda.developmentStage.label}</Badge>}</TableCell>
                  <TableCell className="text-nowrap">{lda.location && <Badge variant="outline">{lda.location.label}</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {lda.focusAreas.map((focusArea) => <DynamicIcon key={`lda-${lda.id}-focusArea-${focusArea.id}`} name={focusArea.icon} size={10} />)}
                    </div>
                    <DynamicIcon name="Thermometer" size={10} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {
                        [...new Set(lda.funds.flatMap((fund) => fund.funders.map(funder => funder.id)))].length
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <AlertTriangleIcon size={10} />
                        <div>{1}</div>
                      </Badge>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Clock3Icon size={10} />
                        <div>{2}</div>
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="bg-slate-400 text-white dark:text-black rounded-full w-5 h-5 text-[0.5rem] flex items-center justify-center" title={lda.programmeOfficer?.name ?? ""}>
                      {getInitials(lda.programmeOfficer?.name ?? "")}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}