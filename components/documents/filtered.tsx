"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { LocalDevelopmentAgency } from "@prisma/client"
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
import { InfoIcon, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

  const documentTypeOptions: FilterOption[] = availableDocumentTypes.map(({ id, label }) => ({ id, label }))

  const filterConfigs = [
    { type: 'type', label: 'Type', options: documentTypeOptions },
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
      const selectedTypes = (activeFilters['type'] || []).map(o => o.id)

      const selectedDocumentTypeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(item.documentType)

      const searchMatch =
        searchTerm.trim() === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())

      return searchMatch && selectedDocumentTypeMatch
    })

    setFilteredDocuments(filtered)
  }, [activeFilters, searchTerm, documents])

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
            className="hidden md:flex"
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
                    <TableCell>
                      {document.description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <InfoIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[20rem]">
                              {document.description}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
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
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <DocumentFormDialog
                              document={document}
                              lda={lda}
                              callback={dataChanged}
                            />
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