"use client"

import { useMemo, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/routing"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { FormTemplateWithRelations } from "@/types/models"

// Acronyms that should stay fully uppercased when formatting category slugs.
const CATEGORY_ACRONYMS = new Set(["dft", "fris", "lda", "scat", "npo", "bpo", "fbo"])

// Turn a stored category slug (e.g. "dft_report") into a readable label ("DFT Report").
function formatCategory(category?: string | null): string {
  if (!category) return "—"
  return category
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) =>
      CATEGORY_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ")
}

interface Props {
  formTemplates: FormTemplateWithRelations[]
}

export function FilteredFormTemplates({ formTemplates }: Props) {
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})

  const typeOptions: FilterOption[] = useMemo(() => [
    { id: "APPLICATION", label: "Application" },
    { id: "REPORT", label: "Report" },
  ], [])

  const statusOptions: FilterOption[] = useMemo(() => [
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
  ], [])

  // Build category options from the distinct categories present in the data.
  const categoryOptions: FilterOption[] = useMemo(() => {
    const cats = Array.from(
      new Set(formTemplates.map((t) => t.formCategory).filter(Boolean))
    ) as string[]
    return cats
      .sort()
      .map((c) => ({ id: c, label: formatCategory(c) }))
  }, [formTemplates])

  const filterConfigs = useMemo(() => [
    { type: "type", label: "Template type", options: typeOptions },
    { type: "category", label: "Form category", options: categoryOptions },
    { type: "status", label: "Status", options: statusOptions },
  ], [typeOptions, categoryOptions, statusOptions])

  const handleFilterChange = useCallback((filterType: string, selected: FilterOption[]) => {
    setActiveFilters((prev) => ({ ...prev, [filterType]: selected }))
  }, [])

  const handleResetFilters = useCallback(() => setActiveFilters({}), [])

  const filtered = useMemo(() => {
    const types = (activeFilters["type"] || []).map((o) => String(o.id))
    const cats = (activeFilters["category"] || []).map((o) => String(o.id))
    const statuses = (activeFilters["status"] || []).map((o) => String(o.id))

    return formTemplates.filter((t) => {
      if (types.length && !types.includes(t.templateType)) return false
      if (cats.length && !(t.formCategory && cats.includes(t.formCategory))) return false
      if (statuses.length && !statuses.includes(t.active ? "active" : "inactive")) return false
      return true
    })
  }, [formTemplates, activeFilters])

  return (
    <div className="mt-4 space-y-4">
      <FilterBar
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        filterConfigs={filterConfigs}
        activeFilters={activeFilters}
      />

      <Card className="w-full">
        <CardContent>
          <Table className="text-xs w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">Template Name</TableHead>
                <TableHead className="text-nowrap">Template type</TableHead>
                <TableHead className="text-nowrap">Form category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((formTemplate) => (
                <TableRow key={formTemplate.id}>
                  <TableCell>
                    <Link href={`/dashboard/form-templates/${formTemplate.id}`}>
                      {formTemplate.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-nowrap">{formTemplate.templateType}</TableCell>
                  <TableCell className="text-nowrap">{formatCategory(formTemplate.formCategory)}</TableCell>
                  <TableCell>
                    <Badge variant={formTemplate.active ? "default" : "secondary"}>
                      {formTemplate.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formTemplate.localDevelopmentAgencyForms.length}
                  </TableCell>
                  <TableCell>
                    {formTemplate.localDevelopmentAgencyForms.filter((f) => f.submitted).length}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No form templates match the selected filters.
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
