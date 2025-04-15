"use client"

import { FunderFull } from '@/types/models'

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect";
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertTriangleIcon, BuildingIcon, Clock3Icon } from "lucide-react";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { DynamicIcon } from '../dynamicIcon';
import { format } from "date-fns"
import { FundingStatus, FocusArea } from '@prisma/client'

interface FilteredFundersProps {
  funders: FunderFull[]
}

export const FilteredFunders: React.FC<FilteredFundersProps> = ({ funders }) => {
  const [selectedFundingStatuses, setSelectedFundingStatuses] = useState<string[]>([])
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<number[]>([]);

  const fundingStatuses: FundingStatus[] = Array.from(
    new Map(funders.flatMap((funder) => funder.fundingStatus).map((item) => [item.id, item])).values()
  )

  const focusAreas: FocusArea[] = [
    ...new Map(
      funders.flatMap((funder) => funder.focusAreas).map((item) => [item.id, item])
    ).values(),
  ]

  const years = new Set<number>();

  funders.forEach((funder) => {
    if (funder.fundingStart) years.add(new Date(funder.fundingStart).getFullYear());
    if (funder.fundingEnd) years.add(new Date(funder.fundingEnd).getFullYear());
  });

  const availableFundingPeriods = Array.from(years)
    .sort((a, b) => a - b)
    .map((year) => ({ value: String(year), label: String(year) }));

  const [FilteredFunders, setFilteredFunders] = useState<FunderFull[]>(funders)

  useEffect(() => {
    const filtered = funders.filter((funder) => {
      const focusAreaMatch =
        selectedFocusAreas.length === 0 ||
        funder.focusAreas.some((focusArea) =>
          selectedFocusAreas.includes(String(focusArea.id))
        );

      const fundingStatusMatch =
        selectedFundingStatuses.length === 0 ||
        selectedFundingStatuses.includes(String(funder.fundingStatusId));

      const searchMatch =
        searchTerm.trim() === "" ||
        funder.name.toLowerCase().includes(searchTerm.toLowerCase());

      const fundingStartYear = funder.fundingStart ? new Date(funder.fundingStart).getFullYear() : null;
      const fundingEndYear = funder.fundingEnd ? new Date(funder.fundingEnd).getFullYear() : null;

      const fundingPeriodMatch =
        selectedFundingPeriods.length === 0 ||
        (fundingStartYear && selectedFundingPeriods.includes(fundingStartYear)) ||
        (fundingEndYear && selectedFundingPeriods.includes(fundingEndYear));

      return focusAreaMatch && fundingStatusMatch && searchMatch && fundingPeriodMatch;
    });

    setFilteredFunders(filtered);
  }, [selectedFocusAreas, selectedFundingStatuses, searchTerm, selectedFundingPeriods, funders]);

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
              options={availableFundingPeriods}
              value={selectedFundingPeriods.map(String)}
              onValueChange={(values: string[]) => setSelectedFundingPeriods(values.map(Number))}
              placeholder="All funding periods"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
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
                <TableHead>LDAs</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead className="text-nowrap">Focus Areas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FilteredFunders.map((funder) => (
                <TableRow key={funder.id}>
                  <TableCell>
                    <Link href={`/dashboard/funders/${funder.id}`} className="flex items-center space-x-1">
                      <BuildingIcon size={10} />
                      <span>{funder.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell><Badge variant="outline">{funder.fundingStatus.label}</Badge></TableCell>
                  <TableCell>{format(funder.fundingStart, 'P')}</TableCell>
                  <TableCell>{format(funder.fundingEnd, 'P')}</TableCell>
                  <TableCell className="text-nowrap">R{funder.amount.toString()}</TableCell>
                  <TableCell></TableCell>
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
                    <div className="flex items-center space-x-2">
                      {funder.focusAreas.map((focusArea) => <DynamicIcon key={`funder-${funder.id}-focusArea-${focusArea.id}`} name={focusArea.icon} size={10} />)}
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