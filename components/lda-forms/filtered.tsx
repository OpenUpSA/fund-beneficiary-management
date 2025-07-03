"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import Link from "next/link"
import { availableApplicationsAndReportsTypes, availableStatuses, availableFundingPeriods } from "@/app/data"
import { FormTemplateWithRelations, LocalDevelopmentAgencyFormFull, LocalDevelopmentAgencyFull } from "@/types/models"
import { format } from "date-fns"
import { DynamicIcon } from "@/components/dynamicIcon"
import { FormStatus } from "@prisma/client"
import { FormDialog } from "@/components/lda-forms/form"

interface Props {
  ldaForms: LocalDevelopmentAgencyFormFull[]
  lda?: LocalDevelopmentAgencyFull,
  formTemplates: FormTemplateWithRelations[],
  formStatuses: FormStatus[],
  dataChanged: () => void,
  navigatedFrom?: string
}

export const FilteredLDAForms: React.FC<Props> = ({ ldaForms, lda, formTemplates, formStatuses, dataChanged, navigatedFrom }) => {
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedApplicationsAndReportsTypes, setSelectedApplicationsAndReportsTypes] = useState<string[]>([])

  const getLdaFormLink = (ldaFormId: number): string => {
    return navigatedFrom
      ? `/dashboard/applications-reports/${ldaFormId}?from=${navigatedFrom}`
      : `/dashboard/applications-reports/${ldaFormId}`;
  };


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
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <span>All Applications &amp; Reports</span>
            <div>
              {lda && <FormDialog
                formTemplates={formTemplates}
                formStatuses={formStatuses}
                lda={lda}
                callback={dataChanged} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="text-xs w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">Type</TableHead>
                {!lda && <TableHead><abbr title="Local Development Ageny">LDA</abbr></TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-nowrap">Due date</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ldaForms.map((ldaForm) => (
                <>
                  <TableRow key={`application-${ldaForm.id}`}>
                    <TableCell className="text-nowrap">
                      <Link href={getLdaFormLink(ldaForm.id)} className="flex items-center space-x-1">
                        {ldaForm.title}
                      </Link>
                    </TableCell>
                    {!lda && <TableCell className="text-nowrap">{ldaForm.localDevelopmentAgency.name}</TableCell>}
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DynamicIcon name={ldaForm.formStatus.icon} size={10} />
                        <div>{ldaForm.formStatus.label}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-nowrap"></TableCell>
                    <TableCell className="text-nowrap">{format(ldaForm.dueDate, 'PP')}</TableCell>
                    <TableCell className="text-nowrap">{ldaForm.submitted && format(ldaForm.submitted, 'PP')}</TableCell>
                    <TableCell className="text-nowrap">{ldaForm.approved && format(ldaForm.approved, 'PP')}</TableCell>
                  </TableRow >
                </>
              ))}
            </TableBody >
          </Table>
        </CardContent>
      </Card>
    </div >
  )
}