"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { FileClockIcon, RotateCcwIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { describeRule, frequencyLabel, statusLabel } from "@/lib/report-rule-format"

interface Status { id: number; label: string }
interface Override {
  enabled: boolean | null
  triggerStatusId: number | null
  dueDays: number | null
  periodMonths: number | null
  opensDaysBefore: number | null
  dueDaysAfterPeriodEnd: number | null
  reportTemplateId: number | null
}
interface Rule {
  id: number
  kind: "AFTER_STATUS" | "PERIODIC"
  active: boolean
  triggerStatusId: number | null
  dueDays: number | null
  periodMonths: number | null
  opensDaysBefore: number
  dueDaysAfterPeriodEnd: number
  reportCategory: { id: number; label: string; templates: Array<{ id: number; name: string; active: boolean }> }
  override: Override | null
}
interface Settings {
  template: { id: number; name: string; category: { id: number; label: string; role: string } | null }
  statuses: Status[]
  rules: Rule[]
}

const EMPTY: Override = {
  enabled: null, triggerStatusId: null, dueDays: null, periodMonths: null,
  opensDaysBefore: null, dueDaysAfterPeriodEnd: null, reportTemplateId: null,
}

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value))

// A setting that shows the category's value and lets this template change it
function Field({
  label,
  inherited,
  changed,
  onReset,
  children,
}: {
  label: string
  inherited: string
  changed: boolean
  onReset: () => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {changed && (
          <button type="button" onClick={onReset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcwIcon className="h-3 w-3" /> Reset
          </button>
        )}
      </div>
      {children}
      <p className="text-xs text-muted-foreground">{changed ? `Category: ${inherited}` : "From category"}</p>
    </div>
  )
}

function RuleOverrideForm({ templateId, rule, statuses, onSaved }: {
  templateId: number
  rule: Rule
  statuses: Status[]
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Override>(rule.override ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<Override>) => setDraft((d) => ({ ...d, ...patch }))
  const periodic = rule.kind === "PERIODIC"
  const changes = Object.values(draft).filter((v) => v !== null).length
  const dirty = JSON.stringify(draft) !== JSON.stringify(rule.override ?? EMPTY)

  const effective = {
    ...rule,
    triggerStatusId: draft.triggerStatusId ?? rule.triggerStatusId,
    dueDays: draft.dueDays ?? rule.dueDays,
    periodMonths: draft.periodMonths ?? rule.periodMonths,
    opensDaysBefore: draft.opensDaysBefore ?? rule.opensDaysBefore,
    dueDaysAfterPeriodEnd: draft.dueDaysAfterPeriodEnd ?? rule.dueDaysAfterPeriodEnd,
  }
  const enabled = rule.active && (draft.enabled ?? true)
  const inheritedStatus = rule.triggerStatusId
    ? statusLabel(statuses.find((s) => s.id === rule.triggerStatusId)?.label ?? "")
    : "Approved"

  async function save(next: Override) {
    setSaving(true)
    const response = await fetch(`/api/form-template/${templateId}/report-settings/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
    setSaving(false)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      toast.error(error?.error || "Failed to save report settings")
      return
    }
    toast.success("Report settings saved")
    onSaved()
  }

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{rule.reportCategory.label}</p>
          <p className="text-sm text-muted-foreground">{enabled ? describeRule(effective, statuses) : "Off for this template"}</p>
        </div>
        <div className="flex items-center gap-2">
          {changes > 0 && <Badge variant="secondary" className="font-normal">{changes} change{changes === 1 ? "" : "s"}</Badge>}
          <label className="flex items-center gap-2 text-sm">
            On
            <Switch
              checked={enabled}
              disabled={!rule.active}
              onCheckedChange={(checked) => set({ enabled: checked ? null : false })}
            />
          </label>
        </div>
      </div>
      {!rule.active && <p className="text-sm text-muted-foreground">This rule is switched off for the whole category.</p>}

      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={periodic ? "Start once the form is" : "Create when the form is"}
            inherited={inheritedStatus}
            changed={draft.triggerStatusId !== null}
            onReset={() => set({ triggerStatusId: null })}
          >
            <Select
              value={(draft.triggerStatusId ?? rule.triggerStatusId)?.toString() ?? "approved"}
              onValueChange={(value) => {
                const id = value === "approved" ? null : parseInt(value, 10)
                set({ triggerStatusId: id === rule.triggerStatusId ? null : id })
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                {statuses.filter((s) => s.label !== "Approved").map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{statusLabel(s.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {!periodic && (
            <Field
              label="Due (days after)"
              inherited={rule.dueDays != null ? `${rule.dueDays} days` : "no due date"}
              changed={draft.dueDays !== null}
              onReset={() => set({ dueDays: null })}
            >
              <Input type="number" min={0} max={365} placeholder={rule.dueDays?.toString() ?? "No due date"}
                value={draft.dueDays ?? ""} onChange={(e) => set({ dueDays: numberOrNull(e.target.value) })} />
            </Field>
          )}

          {periodic && (
            <>
              <Field
                label="Every (months)"
                inherited={frequencyLabel(rule.periodMonths)}
                changed={draft.periodMonths !== null}
                onReset={() => set({ periodMonths: null })}
              >
                <Input type="number" min={1} max={60} placeholder={rule.periodMonths?.toString()}
                  value={draft.periodMonths ?? ""} onChange={(e) => set({ periodMonths: numberOrNull(e.target.value) })} />
              </Field>
              <Field
                label="Opens (days before period end)"
                inherited={`${rule.opensDaysBefore} days`}
                changed={draft.opensDaysBefore !== null}
                onReset={() => set({ opensDaysBefore: null })}
              >
                <Input type="number" min={0} max={365} placeholder={rule.opensDaysBefore.toString()}
                  value={draft.opensDaysBefore ?? ""} onChange={(e) => set({ opensDaysBefore: numberOrNull(e.target.value) })} />
              </Field>
              <Field
                label="Due (days after period end)"
                inherited={`${rule.dueDaysAfterPeriodEnd} days`}
                changed={draft.dueDaysAfterPeriodEnd !== null}
                onReset={() => set({ dueDaysAfterPeriodEnd: null })}
              >
                <Input type="number" min={-365} max={365} placeholder={rule.dueDaysAfterPeriodEnd.toString()}
                  value={draft.dueDaysAfterPeriodEnd ?? ""} onChange={(e) => set({ dueDaysAfterPeriodEnd: numberOrNull(e.target.value) })} />
              </Field>
            </>
          )}

          <Field
            label="Report template"
            inherited={`active ${rule.reportCategory.label} template`}
            changed={draft.reportTemplateId !== null}
            onReset={() => set({ reportTemplateId: null })}
          >
            <Select
              value={draft.reportTemplateId?.toString() ?? "active"}
              onValueChange={(value) => set({ reportTemplateId: value === "active" ? null : parseInt(value, 10) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active template in {rule.reportCategory.label}</SelectItem>
                {rule.reportCategory.templates.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}{t.active ? "" : " (inactive)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {changes > 0 && (
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => { setDraft(EMPTY); save(EMPTY) }}>
            Reset to category
          </Button>
        )}
        <Button size="sm" disabled={saving || !dirty} onClick={() => save(draft)}>Save</Button>
      </div>
    </div>
  )
}

/** A template's report settings: the category's rules, with this template's changes. */
export function ReportSettingsDialog({
  templateId,
  open,
  onOpenChange,
  onSaved,
}: {
  templateId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [settings, setSettings] = useState<Settings | null>(null)

  const load = useCallback(() => {
    fetch(`/api/form-template/${templateId}/report-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setSettings)
      .catch(() => setSettings(null))
  }, [templateId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const category = settings?.template.category

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reports for {settings?.template.name ?? "…"}</DialogTitle>
          <DialogDescription>
            {category
              ? `Defaults come from the ${category.label} category. Changes here apply only to forms from this template, and only to reports created from now on.`
              : "This template has no category, so its forms get no reports. Assign one on the Categories page."}
          </DialogDescription>
        </DialogHeader>
        {settings && category && settings.rules.length === 0 && (
          <p className="text-sm text-muted-foreground">The {category.label} category has no report rules yet.</p>
        )}
        <div className="space-y-3">
          {settings?.rules.map((rule) => (
            <RuleOverrideForm
              key={`${rule.id}-${JSON.stringify(rule.override)}`}
              templateId={templateId}
              rule={rule}
              statuses={settings.statuses}
              onSaved={() => {
                load()
                onSaved?.()
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** "Reports" button for the template editor header. */
export function ReportSettingsButton({ templateId }: { templateId: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileClockIcon className="h-4 w-4" />
        <span className="hidden md:inline">Reports</span>
      </Button>
      <ReportSettingsDialog templateId={templateId} open={open} onOpenChange={setOpen} />
    </>
  )
}
