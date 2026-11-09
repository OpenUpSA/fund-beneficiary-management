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
import type { ReportRule } from "@prisma/client"

interface Option { id: number; label: string }

// "after" = one report after a status; a number = periodic every N months; "custom" = periodic, months typed in
type When = "after" | "custom" | `${number}`

function initialWhen(rule?: ReportRule): When {
  if (!rule) return "after"
  if (rule.kind === "AFTER_STATUS") return "after"
  return FREQUENCY_OPTIONS.some((o) => o.months === rule.periodMonths) ? (`${rule.periodMonths}` as When) : "custom"
}

const toNumber = (value: string) => (value.trim() === "" ? null : Number(value))

/** Add or edit a category's report rule. */
export function RuleDialog({
  open,
  onOpenChange,
  parentCategory,
  reportCategories,
  statuses,
  rule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentCategory: Option
  reportCategories: Option[]
  statuses: Option[]
  rule?: ReportRule
}) {
  const router = useRouter()
  const [reportCategoryId, setReportCategoryId] = useState<number | null>(rule?.reportCategoryId ?? null)
  const [when, setWhen] = useState<When>(initialWhen(rule))
  const [customMonths, setCustomMonths] = useState(rule?.periodMonths?.toString() ?? "4")
  const [triggerStatusId, setTriggerStatusId] = useState<number | null>(rule?.triggerStatusId ?? null)
  const [dueDays, setDueDays] = useState(rule?.dueDays?.toString() ?? "30")
  const [opensDaysBefore, setOpensDaysBefore] = useState(rule?.opensDaysBefore.toString() ?? "14")
  const [dueAfterEnd, setDueAfterEnd] = useState(rule?.dueDaysAfterPeriodEnd.toString() ?? "15")
  const [saving, setSaving] = useState(false)

  const periodic = when !== "after"
  // Changing the kind of an existing rule means a new rule (its reports are tracked per rule)
  const kindLocked = !!rule

  async function save() {
    setSaving(true)
    const periodMonths = when === "custom" ? toNumber(customMonths) : periodic ? Number(when) : null
    const body = {
      ...(!rule && { parentCategoryId: parentCategory.id, reportCategoryId, kind: periodic ? "PERIODIC" : "AFTER_STATUS" }),
      triggerStatusId,
      ...(periodic
        ? { periodMonths, opensDaysBefore: toNumber(opensDaysBefore), dueDaysAfterPeriodEnd: toNumber(dueAfterEnd) }
        : { dueDays: toNumber(dueDays) }),
    }
    const response = await fetch(rule ? `/api/report-rule/${rule.id}` : "/api/report-rule", {
      method: rule ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      toast.error(error?.error || "Failed to save report")
      return
    }
    toast.success(rule ? "Report updated" : "Report added")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit report" : `Add a report to ${parentCategory.label}`}</DialogTitle>
          <DialogDescription>
            The default for every {parentCategory.label} template; a template can change it under its report settings.
            Changes apply to reports created from now on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Report</Label>
            <Select
              value={reportCategoryId?.toString() ?? ""}
              onValueChange={(value) => setReportCategoryId(parseInt(value, 10))}
              disabled={kindLocked}
            >
              <SelectTrigger><SelectValue placeholder="Choose a report category" /></SelectTrigger>
              <SelectContent>
                {reportCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>When</Label>
            <Select value={when} onValueChange={(value) => setWhen(value as When)} disabled={kindLocked && !periodic}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(!kindLocked || !periodic) && <SelectItem value="after">Once, after a status</SelectItem>}
                {(!kindLocked || periodic) && FREQUENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.months} value={`${o.months}`}>{o.label}</SelectItem>
                ))}
                {(!kindLocked || periodic) && <SelectItem value="custom">Every N months</SelectItem>}
              </SelectContent>
            </Select>
            {periodic && (
              <p className="text-xs text-muted-foreground">
                Periods split each form&apos;s own start and end dates, e.g. an April–March grant gets April–June as its first quarter.
              </p>
            )}
          </div>

          {when === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="rule-months">Every (months)</Label>
              <Input id="rule-months" type="number" min={1} max={60} value={customMonths} onChange={(e) => setCustomMonths(e.target.value)} />
            </div>
          )}

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
              <Label htmlFor="rule-due">Due (days after)</Label>
              <Input id="rule-due" type="number" min={0} max={365} placeholder="No due date" value={dueDays} onChange={(e) => setDueDays(e.target.value)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rule-opens">Opens (days before period end)</Label>
                <Input id="rule-opens" type="number" min={0} max={365} value={opensDaysBefore} onChange={(e) => setOpensDaysBefore(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-due-end">Due (days after period end)</Label>
                <Input id="rule-due-end" type="number" min={-365} max={365} value={dueAfterEnd} onChange={(e) => setDueAfterEnd(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !reportCategoryId}>{rule ? "Save" : "Add report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
