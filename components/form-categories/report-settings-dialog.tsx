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
import { categoryTiming, describeRule, frequencyLabel, statusLabel } from "@/lib/report-rule-format"
import { effectiveTiming, plannedRows, type CategoryTiming } from "@/lib/report-timing"

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
interface ReportCategory extends CategoryTiming {
  id: number
  label: string
  templates: Array<{ id: number; name: string; active: boolean; createdAt: string }>
}
interface Link {
  id: number
  active: boolean
  reportCategory: ReportCategory
  override: Override | null
}
interface Settings {
  template: { id: number; name: string; category: { id: number; label: string; role: string } | null }
  statuses: Status[]
  rules: Link[]
}
interface ExamplePeriod { start: string; end: string }

const EMPTY: Override = {
  enabled: null, triggerStatusId: null, dueDays: null, periodMonths: null,
  opensDaysBefore: null, dueDaysAfterPeriodEnd: null, reportTemplateId: null,
}

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value))
// Example dates are UTC calendar days, shown as e.g. "16 Jun 2026"
const showDay = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
const yearExample = (): ExamplePeriod => {
  const year = new Date().getFullYear()
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

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

/** What a form running over the example period would get from this timing. */
function ExampleTimeline({ link, draft, example, statuses }: {
  link: Link
  draft: Override
  example: ExamplePeriod
  statuses: Status[]
}) {
  const timing = effectiveTiming(link.reportCategory, draft, link.active)
  const start = new Date(`${example.start}T00:00:00Z`)
  const end = new Date(`${example.end}T00:00:00Z`)
  if (!timing || !timing.enabled || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const rows = plannedRows({ fundingStart: start, fundingEnd: end }, timing)
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No reports for this example period.</p>

  const trigger = timing.triggerStatusId
    ? statusLabel(statuses.find((s) => s.id === timing.triggerStatusId)?.label ?? "")
    : "Approved"
  return (
    <div className="rounded-md bg-muted/50 p-3 text-xs">
      <p className="mb-1 font-medium">For a form running {showDay(start)} – {showDay(end)}:</p>
      <ul className="space-y-0.5 text-muted-foreground">
        {rows.map((row) => (
          <li key={row.period}>
            {row.opensOn ? (
              <>
                <span className="text-foreground">{row.label}</span> ({showDay(row.periodStart)} – {showDay(row.periodEnd)}) ·
                opens {showDay(row.opensOn)} · due {row.dueOn ? showDay(row.dueOn) : "—"}
              </>
            ) : (
              <>Created when the form is {trigger} · {row.dueDays != null ? `due ${row.dueDays} days later` : "no due date"}</>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RuleOverrideForm({ templateId, link, statuses, example, onSaved }: {
  templateId: number
  link: Link
  statuses: Status[]
  example: ExamplePeriod
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Override>(link.override ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<Override>) => setDraft((d) => ({ ...d, ...patch }))
  const base = categoryTiming(link.reportCategory)
  const category = link.reportCategory
  const changes = Object.values(draft).filter((v) => v !== null).length
  const dirty = JSON.stringify(draft) !== JSON.stringify(link.override ?? EMPTY)

  async function save(next: Override) {
    setSaving(true)
    const response = await fetch(`/api/form-template/${templateId}/report-settings/${link.id}`, {
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

  if (!base) {
    return (
      <div className="rounded-md border p-4 text-sm">
        <p className="font-medium">{category.label}</p>
        <p className="text-destructive">No timing set on the {category.label} report category yet, so forms don&apos;t get it.</p>
      </div>
    )
  }

  const periodic = base.kind === "PERIODIC"
  const effective = {
    ...base,
    triggerStatusId: draft.triggerStatusId ?? base.triggerStatusId,
    dueDays: draft.dueDays ?? base.dueDays,
    periodMonths: draft.periodMonths ?? base.periodMonths,
    opensDaysBefore: draft.opensDaysBefore ?? base.opensDaysBefore,
    dueDaysAfterPeriodEnd: draft.dueDaysAfterPeriodEnd ?? base.dueDaysAfterPeriodEnd,
  }
  const enabled = link.active && (draft.enabled ?? true)
  const inheritedStatus = base.triggerStatusId
    ? statusLabel(statuses.find((s) => s.id === base.triggerStatusId)?.label ?? "")
    : "Approved"

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{category.label}</p>
          <p className="text-sm text-muted-foreground">{enabled ? describeRule(effective, statuses) : "Off for this template"}</p>
        </div>
        <div className="flex items-center gap-2">
          {changes > 0 && <Badge variant="secondary" className="font-normal">{changes} change{changes === 1 ? "" : "s"}</Badge>}
          <label className="flex items-center gap-2 text-sm">
            On
            <Switch
              checked={enabled}
              disabled={!link.active}
              onCheckedChange={(checked) => set({ enabled: checked ? null : false })}
            />
          </label>
        </div>
      </div>
      {!link.active && <p className="text-sm text-muted-foreground">This report is switched off for the whole category.</p>}

      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={periodic ? "Start once the form is" : "Create when the form is"}
            inherited={inheritedStatus}
            changed={draft.triggerStatusId !== null}
            onReset={() => set({ triggerStatusId: null })}
          >
            <Select
              value={(draft.triggerStatusId ?? base.triggerStatusId)?.toString() ?? "approved"}
              onValueChange={(value) => {
                const id = value === "approved" ? null : parseInt(value, 10)
                set({ triggerStatusId: id === base.triggerStatusId ? null : id })
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
              inherited={base.dueDays != null ? `${base.dueDays} days` : "no due date"}
              changed={draft.dueDays !== null}
              onReset={() => set({ dueDays: null })}
            >
              <Input type="number" min={0} max={365} placeholder={base.dueDays?.toString() ?? "No due date"}
                value={draft.dueDays ?? ""} onChange={(e) => set({ dueDays: numberOrNull(e.target.value) })} />
            </Field>
          )}

          {periodic && (
            <>
              <Field
                label="Every (months)"
                inherited={frequencyLabel(base.periodMonths)}
                changed={draft.periodMonths !== null}
                onReset={() => set({ periodMonths: null })}
              >
                <Input type="number" min={1} max={60} placeholder={base.periodMonths?.toString()}
                  value={draft.periodMonths ?? ""} onChange={(e) => set({ periodMonths: numberOrNull(e.target.value) })} />
              </Field>
              <Field
                label="Opens (days before period end)"
                inherited={`${base.opensDaysBefore} days`}
                changed={draft.opensDaysBefore !== null}
                onReset={() => set({ opensDaysBefore: null })}
              >
                <Input type="number" min={0} max={365} placeholder={base.opensDaysBefore.toString()}
                  value={draft.opensDaysBefore ?? ""} onChange={(e) => set({ opensDaysBefore: numberOrNull(e.target.value) })} />
              </Field>
              <Field
                label="Due (days after period end)"
                inherited={`${base.dueDaysAfterPeriodEnd} days`}
                changed={draft.dueDaysAfterPeriodEnd !== null}
                onReset={() => set({ dueDaysAfterPeriodEnd: null })}
              >
                <Input type="number" min={-365} max={365} placeholder={base.dueDaysAfterPeriodEnd.toString()}
                  value={draft.dueDaysAfterPeriodEnd ?? ""} onChange={(e) => set({ dueDaysAfterPeriodEnd: numberOrNull(e.target.value) })} />
              </Field>
            </>
          )}

          <Field
            label="Report template"
            inherited={`active ${category.label} template`}
            changed={draft.reportTemplateId !== null}
            onReset={() => set({ reportTemplateId: null })}
          >
            <Select
              value={draft.reportTemplateId?.toString() ?? "active"}
              onValueChange={(value) => set({ reportTemplateId: value === "active" ? null : parseInt(value, 10) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active template in {category.label}</SelectItem>
                {category.templates.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}{t.active ? "" : " (inactive)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <ExampleTimeline link={link} draft={draft} example={example} statuses={statuses} />

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

/** A template's report settings: its category's reports, with this template's changes and an example timeline. */
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
  const [example, setExample] = useState<ExamplePeriod>(yearExample)

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
              ? `Timing comes from each report category. Changes here apply only to forms from this template that are created from now on; approvers can still adjust each form's dates.`
              : "This template has no category, so its forms get no reports. Assign one on the Categories page."}
          </DialogDescription>
        </DialogHeader>

        {settings && category && settings.rules.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="example-start" className="text-xs">Example form starts</Label>
              <Input id="example-start" type="date" value={example.start} onChange={(e) => setExample((x) => ({ ...x, start: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="example-end" className="text-xs">and ends</Label>
              <Input id="example-end" type="date" value={example.end} onChange={(e) => setExample((x) => ({ ...x, end: e.target.value }))} />
            </div>
            <p className="pb-2 text-xs text-muted-foreground">Only for the examples below; nothing is saved.</p>
          </div>
        )}

        {settings && category && settings.rules.length === 0 && (
          <p className="text-sm text-muted-foreground">No reports are attached to the {category.label} category yet.</p>
        )}
        <div className="space-y-3">
          {settings?.rules.map((link) => (
            <RuleOverrideForm
              key={`${link.id}-${JSON.stringify(link.override)}`}
              templateId={templateId}
              link={link}
              statuses={settings.statuses}
              example={example}
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
