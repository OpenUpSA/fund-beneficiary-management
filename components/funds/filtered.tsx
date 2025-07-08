"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect";
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { FundFull } from "@/types/models";
import { FocusArea, FundingStatus, Location } from "@prisma/client";
import { DynamicIcon } from "../dynamicIcon";
import { format } from "date-fns";

interface FilteredFundsProps {
  funds: FundFull[]
  navigatedFrom?: string
}



export const FilteredFunds: React.FC<FilteredFundsProps> = ({ funds, navigatedFrom }) => {
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<number[]>([]);
  const [selectedFundingStatuses, setSelectedFundingStatuses] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredFunds, setFilteredFunds] = useState<FundFull[]>(funds)

  const fundingStatuses: FundingStatus[] = Array.from(
    new Map(funds.flatMap((fund) => fund.fundingStatus).map((item) => [item.id, item])).values()
  )

  const focusAreas: FocusArea[] = [
    ...new Map(
      funds.flatMap((fund) => fund.focusAreas).map((item) => [item.id, item])
    ).values(),
  ]

  const locations: Location[] = [
    ...new Map(
      funds.flatMap((fund) => fund.locations).map((item) => [item.id, item])
    ).values(),
  ]

  const years = new Set<number>();

  funds.forEach((fund) => {
    if (fund.fundingStart) years.add(new Date(fund.fundingStart).getFullYear());
    if (fund.fundingEnd) years.add(new Date(fund.fundingEnd).getFullYear());
  });

  const availableFundingPeriods = Array.from(years)
    .sort((a, b) => a - b)
    .map((year) => ({ value: String(year), label: String(year) }));

  const getFundLink = (fundId: number): string => {
    return navigatedFrom
      ? `/dashboard/funds/${fundId}?from=${navigatedFrom}`
      : `/dashboard/funds/${fundId}`;
  }

  useEffect(() => {
    const filtered = funds.filter((fund) => {
      const focusAreaMatch =
        selectedFocusAreas.length === 0 ||
        fund.focusAreas.some((focusArea) =>
          selectedFocusAreas.includes(String(focusArea.id))
        );

      const locationMatch =
        selectedLocations.length === 0 ||
        fund.locations.some((location) =>
          selectedLocations.includes(String(location.id))
        );

      const fundingStatusMatch =
        selectedFundingStatuses.length === 0 ||
        selectedFundingStatuses.includes(String(fund.fundingStatusId));

      const searchMatch =
        searchTerm.trim() === "" ||
        fund.name.toLowerCase().includes(searchTerm.toLowerCase());

      const fundingStartYear = fund.fundingStart ? new Date(fund.fundingStart).getFullYear() : null;
      const fundingEndYear = fund.fundingEnd ? new Date(fund.fundingEnd).getFullYear() : null;

      const fundingPeriodMatch =
        selectedFundingPeriods.length === 0 ||
        (fundingStartYear && selectedFundingPeriods.includes(fundingStartYear)) ||
        (fundingEndYear && selectedFundingPeriods.includes(fundingEndYear));

      return focusAreaMatch && fundingStatusMatch && searchMatch && fundingPeriodMatch && locationMatch;
    });

    setFilteredFunds(filtered);
  }, [selectedFocusAreas, selectedFundingStatuses, searchTerm, selectedFundingPeriods, selectedLocations, funds]);

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
              options={availableFundingPeriods}
              value={selectedFundingPeriods.map(String)}
              onValueChange={(values: string[]) => setSelectedFundingPeriods(values.map(Number))}
              placeholder="All funding periods"
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
                <TableHead className="text-nowrap">Start date</TableHead>
                <TableHead className="text-nowrap">End date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-nowrap">Focus Areas</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-nowrap">Funded LDAs</TableHead>
                <TableHead>Funder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunds.map((fund) => (
                <TableRow key={fund.id}>
                  <TableCell>
                    <Link href={getFundLink(fund.id)}>
                      {fund.name}
                    </Link>
                  </TableCell>
                  <TableCell><Badge variant="outline">{fund.fundingStatus.label}</Badge></TableCell>
                  <TableCell>{format(fund.fundingStart, 'P')}</TableCell>
                  <TableCell>{format(fund.fundingEnd, 'P')}</TableCell>
                  <TableCell>R{Number(fund.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {fund.focusAreas.map((focusArea) => <DynamicIcon key={`focusArea-${focusArea.id}`} name={focusArea.icon} size={10} />)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {fund.locations.map((location) =>
                        <Badge key={location.id} variant="outline">
                          {location.short}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{fund.localDevelopmentAgencies.length}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {fund.funders?.map((funder: { id: number; name: string }) => (
                        <Badge key={`funder-${funder.id}`} variant="outline">{funder.name}</Badge>
                      ))}
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