"use client"

import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useEffect, useState } from "react"
import Link from "next/link"
import { FocusArea, LocalDevelopmentAgency } from "@prisma/client"
import { FormDialog as DocumentFormDialog } from "@/components/documents/form"
import { DocumentTypeEnum } from "@/types/formSchemas"
import { format } from "date-fns"

import { DocumentFull } from "@/types/models"
import { useTranslations } from "next-intl"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

interface Props {
  documents: DocumentFull[],
  lda?: LocalDevelopmentAgency,
  dataChanged: () => void,
  navigatedFrom?: string
}

export function FilteredDocuments({ documents, dataChanged, lda, navigatedFrom }: Props) {
  const tC = useTranslations('common')

  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])
  const [selectedFundingPeriods, setSelectedFundingPeriods] = useState<number[]>([])
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([])
  const [selectedLDAs, setSelectedLDAs] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

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
  let availableFundingPeriods: { value: string; label: string }[] = [];

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
      .map((year) => ({ value: String(year), label: String(year) }))
  }

  const [filteredDocuments, setFilteredDocuments] = useState<DocumentFull[]>(documents)

  useEffect(() => {
    const filtered = documents.filter((item) => {

      const focusAreaMatch =
        selectedFocusAreas.length === 0 ||
        item.localDevelopmentAgency.focusAreas.some((focusArea) =>
          selectedFocusAreas.includes(String(focusArea.id))
        )

      const selectedDocumentTypeMatch =
        selectedDocumentTypes.length === 0 ||
        selectedDocumentTypes.includes(item.documentType)

      const searchMatch =
        searchTerm.trim() === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())

      let fundingPeriodMatch = true

      if (!lda) {
        const agency = item.localDevelopmentAgency

        const fundingStartYear = agency?.fundingStart
          ? new Date(agency.fundingStart).getFullYear()
          : null

        const fundingEndYear = agency?.fundingEnd
          ? new Date(agency.fundingEnd).getFullYear()
          : null

        fundingPeriodMatch =
          selectedFundingPeriods.length === 0 ||
          (fundingStartYear !== null && selectedFundingPeriods.includes(fundingStartYear)) ||
          (fundingEndYear !== null && selectedFundingPeriods.includes(fundingEndYear))
      }

      const ldaMatch =
        selectedLDAs.length === 0 ||
        (selectedLDAs.includes(String(item.localDevelopmentAgencyId)))

      return focusAreaMatch && searchMatch && selectedDocumentTypeMatch && fundingPeriodMatch && ldaMatch
    })

    setFilteredDocuments(filtered)
  }, [selectedFocusAreas, searchTerm, selectedDocumentTypes, selectedFundingPeriods, selectedLDAs, documents, lda])

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
          {!lda && <div>
            <InputMultiSelect
              options={availableLDAs.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedLDAs}
              onValueChange={(values: string[]) => setSelectedLDAs(values)}
              placeholder="All LDAs"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>}
          <div>
            <InputMultiSelect
              options={availableDocumentTypes.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedDocumentTypes}
              onValueChange={(values: string[]) => setSelectedDocumentTypes(values)}
              placeholder="All document types"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>
          {!lda && <div>
            <InputMultiSelect
              options={focusAreas.map(({ id, label }) => ({ value: String(id), label }))}
              value={selectedFocusAreas}
              onValueChange={(values: string[]) => setSelectedFocusAreas(values)}
              placeholder="All focus areas"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>}
          {!lda && <div>
            <InputMultiSelect
              options={availableFundingPeriods}
              value={selectedFundingPeriods.map(String)}
              onValueChange={(values: string[]) => setSelectedFundingPeriods(values.map(Number))}
              placeholder="All funding periods"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </div>}
        </div>
      </div>
      <Card className="w-full">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <span>All Documents</span>
            <div>
              {lda && <DocumentFormDialog
                lda={lda}
                callback={dataChanged} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="text-xs w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">Name</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-nowrap">Valid from</TableHead>
                <TableHead className="text-nowrap">Valid until</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <Link href={getDocumentLink(document.id)} className="flex items-center space-x-1">
                      <span>{document.filePath.replace(/^\/+/, '')}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-nowrap">{format(document.createdAt, 'PP')}</TableCell>
                  <TableCell className="text-nowrap">{format(document.validFromDate, 'PP')}</TableCell>
                  <TableCell className="text-nowrap">{format(document.validUntilDate, 'PP')}</TableCell>
                </TableRow>
              ))}
            </TableBody >
          </Table>
        </CardContent>
      </Card>
    </div >
  )
}