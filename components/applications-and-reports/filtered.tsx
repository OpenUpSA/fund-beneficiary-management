"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect";
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { PauseIcon } from "lucide-react";
import Link from "next/link";
import { allApplications, availableApplicationsAndReportsTypes, availableStatuses, availableFundingPeriods } from "@/app/data";

export const FilteredApplicationsAndReports = () => {
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedApplicationsAndReportsTypes, setSelectedApplicationsAndReportsTypes] = useState<string[]>([])

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
              options={availableApplicationsAndReportsTypes}
              value={selectedApplicationsAndReportsTypes}
              onValueChange={(values: string[]) => setSelectedApplicationsAndReportsTypes(values)}
              placeholder="All types"
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
        <CardContent>
          <Table className="text-xs w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allApplications.map((application) => (
                <>
                  <TableRow key={`application-${application.id}`}>
                    <TableCell>
                      <Link href={`/dashboard/applications-reports/applications/${application.id}`} className="flex items-center space-x-1">
                        <span>{application.type}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <PauseIcon size={10} />
                        <div>{application.status}</div>
                      </div>
                    </TableCell>
                    <TableCell>{application.amount}</TableCell>
                    <TableCell>{application.dueDate}</TableCell>
                    <TableCell>{application.submittedDate}</TableCell>
                    <TableCell>{application.approvedDate}</TableCell>
                  </TableRow>
                  {application.reports.map((report) => (
                    <TableRow key={`appliation-${application.id}-report-${report.id}`}>
                      <TableCell className="pl-5">
                        <Link href={`/dashboard/applications-reports/applications/${application.id}/reports/${report.id}`} className="flex items-center space-x-1">
                          <span>{report.type}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <PauseIcon size={10} />
                          <div>{report.status}</div>
                        </div>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{report.dueDate}</TableCell>
                      <TableCell>{report.submittedDate}</TableCell>
                      <TableCell>{report.approvedDate}</TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody >
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}