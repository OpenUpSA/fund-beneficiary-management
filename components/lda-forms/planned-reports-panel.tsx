"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { CalendarClockIcon, ExternalLinkIcon, Loader2, PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { statusLabel } from "@/lib/report-rule-format"
import { cn } from "@/lib/utils"

interface PlannedReport {
  id: number
  reportRuleId: number | null
  label: string
  period: number | null
  periodStart: string
  periodEnd: string
  opensOn: string | null
  dueOn: string | null
  dueDays: number | null
  status: "PLANNED" | "SKIPPED" | "CREATED"
  edited: boolean
  reportCategory: { id: number; label: string }
  reportTemplate: { id: number; name: string } | null
  triggerStatus: { id: number; label: string } | null
  reportForm: { id: number; title: string; localDevelopmentAgencyId: number; formStatus: { label: string } } | null
}

interface ReportCategoryOption {
  id: number
  label: string
  templates: Array<{ id: number; name: string }>
}

// Dates are UTC calendar days: "2026-06-16T00:00:00.000Z" -> "16 Jun 2026" / "2026-06-16"
const showDay = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—"
const inputDay = (value: string | null) => (value ? value.slice(0, 10) : "")

async function send(url: string, method: string, body?: unknown): Promise<boolean> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    toast.error(error?.error || "Something went wrong")
  }
  return response.ok
}

interface DateFields { label: string; periodStart: string; periodEnd: string; opensOn: string; dueOn: string }

function DateInputs({ value, onChange, opensHint }: { value: DateFields; onChange: (v: DateFields) => void; opensHint: string }) {
  const field = (key: keyof DateFields, label: string, type = "date") => (
    <div className="space-y-1.5">
      <Label htmlFor={`planned-${key}`}>{label}</Label>
      <Input id={`planned-${key}`} type={type} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
    </div>
  )
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field("periodStart", "Period start")}
      {field("periodEnd", "Period end")}
      <div className="space-y-1.5">
        {field("opensOn", "Opens on")}
        <p className="text-xs text-muted-foreground">{opensHint}</p>
      </div>
      {field("dueOn", "Due on")}
      <div className="sm:col-span-2">{field("label", "Label (e.g. Q2 2026)", "text")}</div>
    </div>
  )
}

/** Approvers' view of the reports a form will get: real dates, editable until each report is created. */
export function PlannedReportsPanel({ ldaFormId }: { ldaFormId: number }) {
  const base = `/api/lda-form/${ldaFormId}/planned-reports`
  const [rows, setRows] = useState<PlannedReport[] | null>(null)
  const [categories, setCategories] = useState<ReportCategoryOption[]>([])
  const [editing, setEditing] = useState<{ row?: PlannedReport; fields: DateFields; reportCategoryId?: number; reportTemplateId?: number | null } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetch(base)
      .then((res) => (res.ok ? res.json() : { rows: [], reportCategories: [] }))
      .then((data) => {
        setRows(data.rows)
        setCategories(data.reportCategories)
      })
      .catch(() => setRows([]))
  }, [base])

  useEffect(load, [load])

  async function run(action: () => Promise<boolean>, success: string) {
    setBusy(true)
    const ok = await action()
    setBusy(false)
    if (ok) {
      toast.success(success)
      load()
    }
  }

  const triggerText = (row: PlannedReport) => `When ${statusLabel(row.triggerStatus?.label ?? "Approved")}`

  function openEdit(row: PlannedReport) {
    setEditing({
      row,
      fields: {
        label: row.label,
        periodStart: inputDay(row.periodStart),
        periodEnd: inputDay(row.periodEnd),
        opensOn: inputDay(row.opensOn),
        dueOn: inputDay(row.dueOn),
      },
    })
  }

  function openAdd() {
    const year = new Date().getFullYear()
    setEditing({
      fields: { label: "", periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`, opensOn: "", dueOn: "" },
      reportCategoryId: categories[0]?.id,
      reportTemplateId: null,
    })
  }

  async function saveEdit() {
    if (!editing) return
    const f = editing.fields
    const body = {
      label: f.label,
      periodStart: f.periodStart,
      periodEnd: f.periodEnd,
      opensOn: f.opensOn || null,
      dueOn: f.dueOn || null,
    }
    await run(
      () => editing.row
        ? send(`${base}/${editing.row.id}`, "PUT", body)
        : send(base, "POST", { ...body, reportCategoryId: editing.reportCategoryId, reportTemplateId: editing.reportTemplateId ?? null }),
      editing.row ? "Planned report updated" : "Report added",
    )
    setEditing(null)
  }

  const chosenCategory = categories.find((c) => c.id === editing?.reportCategoryId)

  return (
    <Card className="col-span-10">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClockIcon className="h-5 w-5" />
            Reports
          </CardTitle>
          <CardDescription>
            Reports this form will get, worked out from its dates when it was created. Change dates, skip one or add
            one for this form only; each is created when it opens (or straight away with Create now).
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Recalculate from the current report settings? Reports that were created, skipped, edited or added by hand are kept.")) return
              run(() => send(`${base}/recalculate`, "POST"), "Reports recalculated")
            }}
          >
            <RefreshCwIcon className="h-4 w-4" />
            Recalculate from settings
          </Button>
          <Button size="sm" disabled={busy || categories.length === 0} onClick={openAdd}>
            <PlusIcon className="h-4 w-4" />
            Add report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No reports planned. Reports attached to this form&apos;s category on the Categories page are planned for new
            forms; use Recalculate to plan them for this one.
          </p>
        ) : (
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
                    <span className="font-medium">{row.reportCategory.label}</span>
                    {row.label && <span> – {row.label}</span>}
                    {row.reportRuleId === null && <Badge variant="outline" className="ml-2 font-normal">One-off</Badge>}
                    {row.reportTemplate && <p className="text-xs text-muted-foreground">Template: {row.reportTemplate.name}</p>}
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
                        className="flex items-center gap-1 hover:underline"
                      >
                        Created · {statusLabel(row.reportForm.formStatus.label)}
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Badge variant={row.status === "SKIPPED" ? "secondary" : "outline"} className="font-normal">
                          {row.status === "SKIPPED" ? "Skipped" : row.status === "CREATED" ? "Created" : "Planned"}
                        </Badge>
                        {row.edited && row.reportRuleId !== null && <span className="text-xs text-muted-foreground">edited</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status !== "CREATED" && (
                      <div className="flex justify-end gap-1">
                        {row.status === "PLANNED" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy} onClick={() => openEdit(row)} aria-label="Edit dates">
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => {
                                if (!window.confirm(`Create the ${row.reportCategory.label} ${row.label} report now?`)) return
                                run(() => send(`${base}/${row.id}/create`, "POST"), "Report created")
                              }}
                            >
                              Create now
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => run(
                            () => send(`${base}/${row.id}`, "PUT", { status: row.status === "SKIPPED" ? "PLANNED" : "SKIPPED" }),
                            row.status === "SKIPPED" ? "Report planned again" : "Report skipped",
                          )}
                        >
                          {row.status === "SKIPPED" ? "Unskip" : "Skip"}
                        </Button>
                        {row.reportRuleId === null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm("Remove this one-off report?")) return
                              run(() => send(`${base}/${row.id}`, "DELETE"), "Report removed")
                            }}
                            aria-label="Remove one-off report"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing.row ? `Edit ${editing.row.reportCategory.label} ${editing.row.label}` : "Add a report to this form"}
              </DialogTitle>
              <DialogDescription>
                {editing.row
                  ? "Only for this form. Edited reports keep their dates when the form's reports are recalculated."
                  : "A one-off report for this form only. It's created when it opens and the form is approved, or with Create now."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!editing.row && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Report</Label>
                    <Select
                      value={editing.reportCategoryId?.toString() ?? ""}
                      onValueChange={(value) => setEditing({ ...editing, reportCategoryId: parseInt(value, 10), reportTemplateId: null })}
                    >
                      <SelectTrigger><SelectValue placeholder="Choose a report" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Template</Label>
                    <Select
                      value={editing.reportTemplateId?.toString() ?? "active"}
                      onValueChange={(value) => setEditing({ ...editing, reportTemplateId: value === "active" ? null : parseInt(value, 10) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Newest active template</SelectItem>
                        {chosenCategory?.templates.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DateInputs
                value={editing.fields}
                onChange={(fields) => setEditing({ ...editing, fields })}
                opensHint={editing.row && !editing.row.opensOn
                  ? `Leave empty to create it ${triggerText(editing.row).toLowerCase()}.`
                  : "Leave empty to create it as soon as the form is approved."}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={busy || (!editing.row && !editing.reportCategoryId)}>
                {editing.row ? "Save" : "Add report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
