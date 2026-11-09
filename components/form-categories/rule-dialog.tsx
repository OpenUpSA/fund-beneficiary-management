"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FREQUENCY_OPTIONS, statusLabel } from "@/lib/report-rule-format"

interface Option { id: number; label: string }

interface ReportCategory extends Option {
  reportKind: string | null
  reportTriggerStatusId: number | null
  reportDueDays: number | null
  reportPeriodMonths: number | null
  reportOpensDaysBefore: number
  reportDueDaysAfterPeriodEnd: number
}

// "after" = one report after a status; a number = quarterly / half-yearly / yearly
type When = "after" | `${number}`

function initialWhen(category: ReportCategory): When {
  if (category.reportKind !== "PERIODIC") return "after"
  return FREQUENCY_OPTIONS.some((o) => o.months === category.reportPeriodMonths) ? (`${category.reportPeriodMonths}` as When) : "3"
}

const toNumber = (value: string) => (value.trim() === "" ? null : Number(value))

async function send(url: string, method: string, body: unknown): Promise<boolean> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    toast.error(error?.error || "Something went wrong")
  }
  return response.ok
}

/** Set a report category's base timing: when its reports are created and when they're due. */
export function TimingDialog({
  open,
  onOpenChange,
  category,
  statuses,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ReportCategory
  statuses: Option[]
}) {
  const router = useRouter()
  const [when, setWhen] = useState<When>(initialWhen(category))
  const [triggerStatusId, setTriggerStatusId] = useState<number | null>(category.reportTriggerStatusId)
  const [dueDays, setDueDays] = useState(category.reportDueDays?.toString() ?? "30")
  const [opensDaysBefore, setOpensDaysBefore] = useState(category.reportOpensDaysBefore.toString())
  const [dueAfterEnd, setDueAfterEnd] = useState(category.reportDueDaysAfterPeriodEnd.toString())
  const [saving, setSaving] = useState(false)

  const periodic = when !== "after"

  async function save() {
    setSaving(true)
    const ok = await send(`/api/form-category/${category.id}`, "PUT", {
      reportKind: periodic ? "PERIODIC" : "AFTER_STATUS",
      reportTriggerStatusId: triggerStatusId,
      reportDueDays: periodic ? null : toNumber(dueDays),
      reportPeriodMonths: periodic ? Number(when) : null,
      ...(periodic && {
        reportOpensDaysBefore: toNumber(opensDaysBefore) ?? 0,
        reportDueDaysAfterPeriodEnd: toNumber(dueAfterEnd) ?? 0,
      }),
    })
    setSaving(false)
    if (ok) {
      toast.success("Timing saved")
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Timing for {category.label}</DialogTitle>
          <DialogDescription>
            Applies to every form this report is attached to; a template can only switch it off or change the status.
            Changes apply to forms created from now on; existing forms keep their dates until an approver recalculates them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>When</Label>
            <Select value={when} onValueChange={(value) => setWhen(value as When)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="after">Once, after a status</SelectItem>
                {FREQUENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.months} value={`${o.months}`}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodic && (
              <p className="text-xs text-muted-foreground">
                Periods split each form&apos;s own start and end dates, e.g. an April–March grant gets April–June as its first quarter.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{periodic ? "Start once the form is" : "Create when the form is"}</Label>
            <Select
              value={triggerStatusId?.toString() ?? "approved"}
              onValueChange={(value) => setTriggerStatusId(value === "approved" ? null : parseInt(value, 10))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                {statuses.filter((s) => s.label !== "Approved").map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{statusLabel(s.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!periodic ? (
            <div className="space-y-1.5">
              <Label htmlFor="timing-due">Due (days after)</Label>
              <Input id="timing-due" type="number" min={0} max={365} placeholder="No due date" value={dueDays} onChange={(e) => setDueDays(e.target.value)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="timing-opens">Opens (days before period end)</Label>
                <Input id="timing-opens" type="number" min={0} max={365} value={opensDaysBefore} onChange={(e) => setOpensDaysBefore(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timing-due-end">Due (days after period end)</Label>
                <Input id="timing-due-end" type="number" min={-365} max={365} value={dueAfterEnd} onChange={(e) => setDueAfterEnd(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Attach a report category to a primary or secondary category. */
export function AttachReportDialog({
  open,
  onOpenChange,
  parentCategory,
  reportCategories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentCategory: Option
  reportCategories: Array<Option & { timing: string }>
}) {
  const router = useRouter()
  const [reportCategoryId, setReportCategoryId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const chosen = reportCategories.find((c) => c.id === reportCategoryId)

  async function save() {
    setSaving(true)
    const ok = await send("/api/report-rule", "POST", { parentCategoryId: parentCategory.id, reportCategoryId })
    setSaving(false)
    if (ok) {
      toast.success("Report attached")
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach a report to {parentCategory.label}</DialogTitle>
          <DialogDescription>
            New {parentCategory.label} forms get this report, timed as set on the Reports tab. Forms that already exist
            get it when an approver recalculates their reports.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Report</Label>
          <Select value={reportCategoryId?.toString() ?? ""} onValueChange={(value) => setReportCategoryId(parseInt(value, 10))}>
            <SelectTrigger><SelectValue placeholder="Choose a report category" /></SelectTrigger>
            <SelectContent>
              {reportCategories.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {chosen && <p className="text-xs text-muted-foreground">{chosen.timing}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !reportCategoryId}>Attach</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
