"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { CalendarClockIcon, ExternalLinkIcon, Loader2, PencilIcon, RefreshCwIcon } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  triggerStatus: { id: number; label: string } | null
  reportForm: { id: number; title: string; localDevelopmentAgencyId: number; formStatus: { label: string } } | null
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

interface DateFields { periodStart: string; periodEnd: string; opensOn: string; dueOn: string }

function DateInputs({ value, onChange, opensHint }: { value: DateFields; onChange: (v: DateFields) => void; opensHint: string }) {
  const field = (key: keyof DateFields, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`planned-${key}`}>{label}</Label>
      <Input id={`planned-${key}`} type="date" value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
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
    </div>
  )
}

/** Approvers' view of the reports a form will get: real dates, editable until each report is created. */
export function PlannedReportsPanel({ ldaFormId }: { ldaFormId: number }) {
  const base = `/api/lda-form/${ldaFormId}/planned-reports`
  const [rows, setRows] = useState<PlannedReport[] | null>(null)
  const [editing, setEditing] = useState<{ row: PlannedReport; fields: DateFields } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetch(base)
      .then((res) => (res.ok ? res.json() : { rows: [] }))
      .then((data) => setRows(data.rows))
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
        periodStart: inputDay(row.periodStart),
        periodEnd: inputDay(row.periodEnd),
        opensOn: inputDay(row.opensOn),
        dueOn: inputDay(row.dueOn),
      },
    })
  }

  async function saveEdit() {
    if (!editing) return
    const f = editing.fields
    const body = {
      periodStart: f.periodStart,
      periodEnd: f.periodEnd,
      opensOn: f.opensOn || null,
      dueOn: f.dueOn || null,
    }
    await run(() => send(`${base}/${editing.row.id}`, "PUT", body), "Planned report updated")
    setEditing(null)
  }

  return (
    <Card className="col-span-10">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClockIcon className="h-5 w-5" />
            Reports
          </CardTitle>
          <CardDescription>
            Reports this form will get, worked out from its dates. Change dates or skip one for this form only; each
            is created when it opens (or straight away with Create now).
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Recalculate from the current report settings? Reports that were created, skipped or edited are kept.")) return
            run(() => send(`${base}/recalculate`, "POST"), "Reports recalculated")
          }}
        >
          <RefreshCwIcon className="h-4 w-4" />
          Recalculate from settings
        </Button>
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
                        {row.edited && <span className="text-xs text-muted-foreground">edited</span>}
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
              <DialogTitle>Edit {editing.row.reportCategory.label} {editing.row.label}</DialogTitle>
              <DialogDescription>
                Only for this form. Edited reports keep their dates when the form&apos;s reports are recalculated.
              </DialogDescription>
            </DialogHeader>
            <DateInputs
              value={editing.fields}
              onChange={(fields) => setEditing({ ...editing, fields })}
              opensHint={`Leave empty to create it ${triggerText(editing.row).toLowerCase()}.`}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={busy}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
