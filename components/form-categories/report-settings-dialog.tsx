"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { FileClockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { categoryTiming, describeRule, statusLabel } from "@/lib/report-rule-format"
import type { CategoryTiming } from "@/lib/report-timing"

interface Status { id: number; label: string }
interface Change { enabled: boolean; triggerStatusId: number | null }
interface Link {
  id: number
  reportCategory: CategoryTiming & { id: number; label: string }
  override: Change | null
}
interface Settings {
  template: { id: number; name: string; category: { id: number; label: string; role: string } | null }
  statuses: Status[]
  rules: Link[]
}

const SAME = "category"

/** One attached report: on/off for this template, and the status that creates it. */
function ReportChange({ templateId, link, statuses, onSaved }: {
  templateId: number
  link: Link
  statuses: Status[]
  onSaved: () => void
}) {
  const saved: Change = link.override ?? { enabled: true, triggerStatusId: null }
  const [draft, setDraft] = useState<Change>(saved)
  const [saving, setSaving] = useState(false)
  const base = categoryTiming(link.reportCategory)
  const name = link.reportCategory.label
  const dirty = draft.enabled !== saved.enabled || draft.triggerStatusId !== saved.triggerStatusId

  async function save() {
    setSaving(true)
    const response = await fetch(`/api/form-template/${templateId}/report-settings/${link.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
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
        <p className="font-medium">{name}</p>
        <p className="text-destructive">No timing set on the {name} report category yet, so forms don&apos;t get it.</p>
      </div>
    )
  }

  const categoryStatus = base.triggerStatusId
    ? statusLabel(statuses.find((s) => s.id === base.triggerStatusId)?.label ?? "")
    : "Approved"
  const effective = { ...base, triggerStatusId: draft.triggerStatusId ?? base.triggerStatusId }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{draft.enabled ? describeRule(effective, statuses) : "Off for this template"}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          On
          <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))} />
        </label>
      </div>

      {draft.enabled && (
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs">{base.kind === "PERIODIC" ? "Start once the form is" : "Create when the form is"}</Label>
          <Select
            value={draft.triggerStatusId?.toString() ?? SAME}
            onValueChange={(value) => setDraft((d) => ({ ...d, triggerStatusId: value === SAME ? null : parseInt(value, 10) }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SAME}>{categoryStatus} (same as category)</SelectItem>
              {statuses
                .filter((s) => s.id !== base.triggerStatusId && !(base.triggerStatusId === null && s.label === "Approved"))
                .map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{statusLabel(s.label)}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" disabled={saving || !dirty} onClick={save}>Save</Button>
      </div>
    </div>
  )
}

/** A template's report settings: its category's reports, each switchable off or triggered at another status. */
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reports for {settings?.template.name ?? "…"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Timing comes from each report category. Here you can switch a report off for this template or create it at a different status. Changes apply to forms created from now on."
              : "This template has no category, so its forms get no reports. Assign one on the Categories page."}
          </DialogDescription>
        </DialogHeader>

        {settings && category && settings.rules.length === 0 && (
          <p className="text-sm text-muted-foreground">No reports are attached to the {category.label} category yet.</p>
        )}
        <div className="space-y-3">
          {settings?.rules.map((link) => (
            <ReportChange
              key={`${link.id}-${JSON.stringify(link.override)}`}
              templateId={templateId}
              link={link}
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
