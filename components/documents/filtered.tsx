"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect";
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { EllipsisVerticalIcon } from "lucide-react";
import Link from "next/link";
import { allDocuments, availableDocumentTypes } from "@/app/data";

export const FilteredDocuments = () => {
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([])

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
              options={availableDocumentTypes}
              value={selectedDocumentTypes}
              onValueChange={(values: string[]) => setSelectedDocumentTypes(values)}
              placeholder="All document types"
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
                <TableHead>Added</TableHead>
                <TableHead>Valid from</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <Link href={`/dashboard/ldas/documents/${document.id}`} className="flex items-center space-x-1">
                      <span>{document.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{document.addedDate}</TableCell>
                  <TableCell>{document.validFromDate}</TableCell>
                  <TableCell>{document.validUntilDate}</TableCell>
                  <TableCell>
                    <EllipsisVerticalIcon size={10} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody >
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}