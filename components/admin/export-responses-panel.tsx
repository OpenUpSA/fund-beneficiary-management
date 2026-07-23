"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, DownloadIcon, FileDown, FileJsonIcon, Loader2, PrinterIcon } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { FormTemplateWithRelations } from "@/types/models"
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface ExportResponsesPanelProps {
  formTemplates: FormTemplateWithRelations[]
  onBack: () => void
}

interface ResponseListItem {
  id: number
  title: string
  formTemplateId: number
  submitted: string | null
  localDevelopmentAgency: { name: string }
  formStatus: { label: string }
}

async function downloadExport(ids: number[], format: "csv" | "json", onDone: () => void) {
  try {
    const res = await fetch(`/api/lda-form/export?ids=${ids.join(",")}&format=${format}`)
    if (!res.ok) {
      const error = await res.json().catch(() => null)
      throw new Error(error?.error || "Export failed")
    }
    const blob = await res.blob()
    const disposition = res.headers.get("Content-Disposition") || ""
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || `responses.${format}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Export failed")
  } finally {
    onDone()
  }
}

export function ExportResponsesPanel({ formTemplates, onBack }: ExportResponsesPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [responses, setResponses] = useState<ResponseListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSelectedIds(new Set())
    if (!selectedTemplate) {
      setResponses([])
      return
    }
    setLoading(true)
    fetch("/api/lda-form")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load responses")
        return res.json()
      })
      .then((data: ResponseListItem[]) => {
        setResponses(data.filter((r) => String(r.formTemplateId) === selectedTemplate))
      })
      .catch(() => toast.error("Failed to load responses"))
      .finally(() => setLoading(false))
  }, [selectedTemplate])

  const allSelected = responses.length > 0 && selectedIds.size === responses.length

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(responses.map((r) => r.id)))
  }

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const templateOptions = useMemo(
    () =>
      formTemplates.map((t) => ({
        value: String(t.id),
        label: t.name,
        description: t.description ?? undefined,
      })),
    [formTemplates]
  )

  const handleExportSelected = (format: "csv" | "json") => {
    if (selectedIds.size === 0) return
    setExporting(true)
    downloadExport([...selectedIds], format, () => setExporting(false))
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Tools
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Responses
          </CardTitle>
          <CardDescription>
            Export submitted form responses as a spreadsheet — a single response, a selection,
            or all responses for a template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-md">
            <Label>Form Template</Label>
            <Combobox
              options={templateOptions}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              placeholder="Select template..."
              searchPlaceholder="Search templates..."
              emptyText="No template found."
            />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading responses...
            </div>
          )}

          {!loading && selectedTemplate && responses.length === 0 && (
            <p className="text-sm text-muted-foreground">No responses found for this template.</p>
          )}

          {!loading && responses.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedIds.size} of {responses.length} selected
                </p>
                <div className="space-x-2">
                  <Button
                    onClick={() => handleExportSelected("csv")}
                    disabled={selectedIds.size === 0 || exporting}
                  >
                    {exporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <DownloadIcon className="mr-2 h-4 w-4" />
                    )}
                    Export CSV ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportSelected("json")}
                    disabled={selectedIds.size === 0 || exporting}
                  >
                    <FileJsonIcon className="mr-2 h-4 w-4" />
                    Export JSON ({selectedIds.size})
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>{LDA_TERMINOLOGY.shortName}</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(response.id)}
                            onCheckedChange={() => toggleOne(response.id)}
                          />
                        </TableCell>
                        <TableCell>{response.localDevelopmentAgency.name}</TableCell>
                        <TableCell>{response.title}</TableCell>
                        <TableCell>{response.formStatus.label}</TableCell>
                        <TableCell>
                          {response.submitted ? format(new Date(response.submitted), "d MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Download this response as CSV"
                              onClick={() => downloadExport([response.id], "csv", () => {})}
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Open printable preview (save as PDF)"
                              onClick={() => window.open(`/form-preview/${response.id}?print=1`, "_blank")}
                            >
                              <PrinterIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
