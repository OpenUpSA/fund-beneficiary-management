"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ExternalLinkIcon, PencilIcon } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { statusLabel } from "@/lib/report-rule-format"
import { cn } from "@/lib/utils"

interface PlannedReport {
  id: number
  label: string
  periodStart: string
  periodEnd: string
  opensOn: string | null
  dueOn: string | null
  dueDays: number | null
  status: "PLANNED" | "SKIPPED" | "CREATED"
  edited: boolean
  reportCategory: { id: number; label: string }
  triggerStatus: { id: number; label: string } | null
  reportForm: { id: number; title: string; localDevelopmentAgencyId: number; formStatus: { label: string } } | null
}

interface Draft { periodStart: string; periodEnd: string; opensOn: string; dueOn: string; label: string }

// Dates are UTC calendar days: "2026-06-16T00:00:00.000Z" -> "16 Jun 2026" / "2026-06-16"
const showDay = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—"
const inputDay = (value: string | null) => (value ? value.slice(0, 10) : "")
const triggerText = (row: PlannedReport) => `When ${statusLabel(row.triggerStatus?.label ?? "Approved")}`

/**
 * Every report a form gets, planned and created (Admin Tools users). Reports not
 * created yet can have their dates and label changed; changed ones are kept when
 * the form's dates or the report settings change.
 */
export function PlannedReportsDialog({
  formId,
  formTitle,
  open,
  onOpenChange,
  onChanged,
}: {
  formId: number
  formTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}) {
  const [rows, setRows] = useState<PlannedReport[] | null>(null)
  const [editing, setEditing] = useState<{ row: PlannedReport; draft: Draft } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/lda-form/${formId}/planned-reports`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setRows)
      .catch(() => setRows([]))
  }, [formId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function setSkipped(row: PlannedReport, skip: boolean) {
    setSaving(true)
    const response = await fetch(`/api/lda-form/${formId}/planned-reports/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: skip ? "SKIPPED" : "PLANNED" }),
    })
    setSaving(false)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      toast.error(error?.error || "Failed to save")
      return
    }
    const name = [row.reportCategory.label, row.label].filter(Boolean).join(" ")
    toast.success(skip ? `${name} skipped` : `${name} planned again`)
    load()
    onChanged?.()
  }

  async function save() {
    if (!editing) return
    const d = editing.draft
    setSaving(true)
    const response = await fetch(`/api/lda-form/${formId}/planned-reports/${editing.row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodStart: d.periodStart,
        periodEnd: d.periodEnd,
        opensOn: d.opensOn || null,
        dueOn: d.dueOn || null,
        label: d.label,
      }),
    })
    setSaving(false)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      toast.error(error?.error || "Failed to save")
      return
    }
    toast.success("Report updated")
    setEditing(null)
    load()
    onChanged?.()
  }

  const field = (key: keyof Draft, label: string, type: "date" | "text" = "date", hint?: string) =>
    editing && (
      <div className="space-y-1.5">
        <Label htmlFor={`planned-${key}`}>{label}</Label>
        <Input
          id={`planned-${key}`}
          type={type}
          value={editing.draft[key]}
          maxLength={type === "text" ? 60 : undefined}
          onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, [key]: e.target.value } })}
        />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    )

  return (
    <>
      <Dialog open={open && !editing} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Reports for {formTitle}</DialogTitle>
            <DialogDescription>
              Each report is created when it opens. Before then you can change its dates or label, or skip it. Changed and
              skipped reports stay that way when the form&apos;s dates or the report settings change.
            </DialogDescription>
          </DialogHeader>
          {rows === null ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              This form gets no reports. Reports are attached to its category on the Categories page.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className={cn(row.status === "SKIPPED" && "text-muted-foreground")}>
                      <TableCell>
                        <span className={cn("font-medium", row.status === "SKIPPED" && "line-through")}>{row.reportCategory.label}</span>
                        {row.label && <span className={cn(row.status === "SKIPPED" && "line-through")}> – {row.label}</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{showDay(row.periodStart)} – {showDay(row.periodEnd)}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.opensOn ? showDay(row.opensOn) : triggerText(row)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.dueOn ? showDay(row.dueOn) : row.dueDays != null ? `${row.dueDays} days after` : "—"}
                      </TableCell>
                      <TableCell>
                        {row.status === "CREATED" && row.reportForm ? (
                          <Link
                            href={`${LDA_TERMINOLOGY.dashboardPath}/${row.reportForm.localDevelopmentAgencyId}/funding-reports/${row.reportForm.id}`}
                            className="flex items-center gap-1 whitespace-nowrap hover:underline"
                          >
                            Created · {statusLabel(row.reportForm.formStatus.label)}
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Badge variant={row.status === "SKIPPED" ? "secondary" : "outline"} className="font-normal">
                              {row.status === "SKIPPED" ? "Skipped" : "Planned"}
                            </Badge>
                            {row.edited && <span className="text-xs text-muted-foreground">changed</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                        {row.status === "PLANNED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={saving}
                            aria-label={`Change ${row.reportCategory.label} ${row.label}`}
                            onClick={() => setEditing({
                              row,
                              draft: {
                                periodStart: inputDay(row.periodStart),
                                periodEnd: inputDay(row.periodEnd),
                                opensOn: inputDay(row.opensOn),
                                dueOn: inputDay(row.dueOn),
                                label: row.label,
                              },
                            })}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {row.status !== "CREATED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={saving}
                            onClick={() => {
                              const skip = row.status === "PLANNED"
                              const name = [row.reportCategory.label, row.label].filter(Boolean).join(" ")
                              if (skip && !window.confirm(`Skip ${name} for this form? It won't be created. You can plan it again later.`)) return
                              setSkipped(row, skip)
                            }}
                          >
                            {row.status === "SKIPPED" ? "Unskip" : "Skip"}
                          </Button>
                        )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editing && (
        <Dialog open onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Change {editing.row.reportCategory.label} {editing.row.label}</DialogTitle>
              <DialogDescription>Only for this form. The label shows in the Year / Quarter column and the report&apos;s title.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("label", "Label", "text", "e.g. Q2 2026, Mid-year")}</div>
              {field("periodStart", "Period start")}
              {field("periodEnd", "Period end")}
              {field("opensOn", "Opens on", "date", `Leave empty to create it ${triggerText(editing.row).toLowerCase()}.`)}
              {field("dueOn", "Due on")}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
