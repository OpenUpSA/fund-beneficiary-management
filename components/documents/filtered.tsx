"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { FocusArea, LocalDevelopmentAgency } from "@prisma/client"
import { FormDialog as DocumentFormDialog } from "@/components/documents/form"
import { DeleteDialog } from "@/components/documents/delete"
import { DocumentTypeEnum } from "@/types/formSchemas"
import { format } from "date-fns"

import { DocumentFull } from "@/types/models"
import { useTranslations } from "next-intl"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, FileEdit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Props {
  documents: DocumentFull[],
  lda?: LocalDevelopmentAgency,
  dataChanged: () => void,
  navigatedFrom?: string
}

export function FilteredDocuments({ documents, dataChanged, lda, navigatedFrom }: Props) {
  const tC = useTranslations('common')

  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})

  const availableDocumentTypes = DocumentTypeEnum.options.map((type) => ({
    id: type,
    label: tC(`documentTypesPlural.${type}`),
  }))

  const getDocumentLink = (documentId: number): string => {
    return navigatedFrom
      ? `/dashboard/documents/${documentId}?from=${navigatedFrom}`
      : `/dashboard/documents/${documentId}`;
  }
  let availableLDAs: { id: string; label: string }[] = []
  let focusAreas: FocusArea[] = []
  let availableFundingPeriods: { id: string; label: string }[] = [];

  if (!lda) {
    availableLDAs = [
      ...new Map(
        documents
          .map((item) => item.localDevelopmentAgency)
          .map((agency) => [agency.id, { id: String(agency.id), label: agency.name }])
      ).values(),
    ]

    focusAreas = [
      ...new Map(
        documents.flatMap(m =>
          m.localDevelopmentAgency.focusAreas.map(fa => [fa.id, fa] as unknown as [string, FocusArea])
        )
      ).values(),
    ]

    const years = new Set<number>()

    documents.forEach((document) => {
      if (document.localDevelopmentAgency.fundingStart) years.add(new Date(document.localDevelopmentAgency.fundingStart).getFullYear())
      if (document.localDevelopmentAgency.fundingEnd) years.add(new Date(document.localDevelopmentAgency.fundingEnd).getFullYear())
    })

    availableFundingPeriods = Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => ({ id: String(year), label: String(year) }))
  }

  const ldaOptions: FilterOption[] = availableLDAs.map(({ id, label }) => ({ id, label }))
  const focusAreaOptions: FilterOption[] = focusAreas.map(({ id, label }) => ({ id: String(id), label }))
  const documentTypeOptions: FilterOption[] = availableDocumentTypes.map(({ id, label }) => ({ id, label }))
  const periodOptions: FilterOption[] = availableFundingPeriods.map(({ id, label }) => ({ id, label }))

  const filterConfigs = [
    !lda ? { type: 'lda', label: 'LDA', options: ldaOptions } : null,
    { type: 'type', label: 'Type', options: documentTypeOptions },
    !lda ? { type: 'focus', label: 'Focus areas', options: focusAreaOptions } : null,
    !lda ? { type: 'period', label: 'Year', options: periodOptions } : null,
  ].filter(Boolean) as { type: string, label: string, options: FilterOption[] }[]

  const handleSearch = (term: string) => setSearchTerm(term)

  const handleFilterChange = useCallback((filterType: string, selectedOptions: FilterOption[]) => {
    setActiveFilters({
      ...activeFilters,
      [filterType]: selectedOptions,
    })
  }, [activeFilters])

  const handleResetFilters = () => {
    setSearchTerm("")
    setActiveFilters({})
    setFilteredDocuments(documents)
  }

  const [filteredDocuments, setFilteredDocuments] = useState<DocumentFull[]>(documents)

  useEffect(() => {
    const filtered = documents.filter((item) => {
      const selectedLdaIds = (activeFilters['lda'] || []).map(o => o.id)
      const selectedTypes = (activeFilters['type'] || []).map(o => o.id)
      const selectedFocusIds = (activeFilters['focus'] || []).map(o => o.id)
      const selectedPeriods = (activeFilters['period'] || []).map(o => o.id)

      const ldaMatch = selectedLdaIds.length === 0 || selectedLdaIds.includes(String(item.localDevelopmentAgencyId))

      const focusAreaMatch =
        selectedFocusIds.length === 0 ||
        item.localDevelopmentAgency.focusAreas.some((fa) => selectedFocusIds.includes(String(fa.id)))

      const selectedDocumentTypeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(item.documentType)

      const searchMatch =
        searchTerm.trim() === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())

      let fundingPeriodMatch = true
      if (!lda) {
        const agency = item.localDevelopmentAgency
        const fundingStartYear = agency?.fundingStart ? new Date(agency.fundingStart).getFullYear() : null
        const fundingEndYear = agency?.fundingEnd ? new Date(agency.fundingEnd).getFullYear() : null
        fundingPeriodMatch =
          selectedPeriods.length === 0 ||
          (fundingStartYear !== null && selectedPeriods.includes(String(fundingStartYear))) ||
          (fundingEndYear !== null && selectedPeriods.includes(String(fundingEndYear)))
      }

      return focusAreaMatch && searchMatch && selectedDocumentTypeMatch && fundingPeriodMatch && ldaMatch
    })

    setFilteredDocuments(filtered)
  }, [activeFilters, searchTerm, documents, lda])

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              type="search"
              id="search"
              placeholder="Filter documents..."
              className="pr-8 h-9"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <FilterBar
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
          />
        </div>
        {lda && (
          <DocumentFormDialog
            lda={lda}
            callback={dataChanged}
          />
        )}
      </div>

      <Card className="w-full text-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Info</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments && filteredDocuments.length > 0 ? (
                filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      <Link href={getDocumentLink(document.id)} className="flex items-center space-x-1">
                        <span>{document.filePath.replace(/^\//g, '')}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-nowrap">{format(document.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell></TableCell>
                    <TableCell>{document.createdBy?.name || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link href={getDocumentLink(document.id)} className="flex items-center gap-2">
                              <FileEdit className="h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <DeleteDialog document={document} callback={dataChanged} />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No documents found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}