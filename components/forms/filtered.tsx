"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect";
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { EllipsisVerticalIcon, LockIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { allFunders, availableStatuses } from "@/app/data";

export const FilteredForms = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const allForms = allFunders.flatMap((funder) => funder.funds).flatMap((fund) => fund.forms) || []

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
              options={availableStatuses}
              value={selectedStatuses}
              onValueChange={(values: string[]) => setSelectedStatuses(values)}
              placeholder="All statuses"
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
                <TableHead>Created</TableHead>
                <TableHead className="text-nowrap">Start date</TableHead>
                <TableHead className="text-nowrap">End date</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead colSpan={2}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allForms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <Link href={`/dashboard/funders/1/funds/1/forms/${form.id}`}>
                      {form.name}
                    </Link>
                  </TableCell>
                  <TableCell><Badge variant="outline">{form.status}</Badge></TableCell>
                  <TableCell>{form.createdDate}</TableCell>
                  <TableCell>{form.startDate}</TableCell>
                  <TableCell>{form.endDate}</TableCell>
                  <TableCell>{form.questions}</TableCell>
                  <TableCell>
                    <LockIcon size={10} />
                  </TableCell>
                  <TableCell>
                    <EllipsisVerticalIcon size={10} />
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