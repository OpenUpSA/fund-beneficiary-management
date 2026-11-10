"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { confirmDateReplan } from "@/lib/confirm-replan"
import { formDateLabels, type FormTemplateTypeValue } from "@/lib/form-template-type"

// Form dates are UTC calendar days: "2026-04-01T00:00:00.000Z" <-> "2026-04-01"
const inputDay = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString().slice(0, 10) : "")

async function send(url: string, method: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) toast.error((data?.error as string) || "Failed to save")
  return { ok: response.ok, data }
}

/**
 * Edit a form's title, and its start and end dates when its template has them
 * and the user can approve it (the same people who change them on the form page).
 * An empty title goes back to the automatic one (template name + period).
 */
export function EditFormDialog({
  form,
  showStart,
  showEnd,
  onOpenChange,
  onSaved,
}: {
  form: {
    id: number
    title: string
    fundingStart: Date | string | null
    fundingEnd: Date | string | null
    templateType?: FormTemplateTypeValue | null
  }
  /** Dates appear only when the template uses them and the user can approve the form */
  showStart: boolean
  showEnd: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [title, setTitle] = useState(form.title)
  const [start, setStart] = useState(inputDay(form.fundingStart))
  const [end, setEnd] = useState(inputDay(form.fundingEnd))
  const [saving, setSaving] = useState(false)
  const labels = formDateLabels(form.templateType ?? undefined)

  const startChanged = showStart && start !== inputDay(form.fundingStart)
  const endChanged = showEnd && end !== inputDay(form.fundingEnd)
  const titleChanged = title.trim() !== form.title

  async function save() {
    if ((startChanged && !start) || (endChanged && !end)) {
      toast.error("Choose a date")
      return
    }
    if (start && end && start > end) {
      toast.error(`${labels.start} must be before ${labels.end.toLowerCase()}`)
      return
    }
    setSaving(true)
    try {
      // Dates first: they re-plan the form's reports (ask first) and update an automatic title
      if (startChanged || endChanged) {
        if (!(await confirmDateReplan(form.id))) return
        const { ok } = await send(`/api/lda-form/${form.id}`, "PATCH", {
          ...(startChanged && { fundingStart: start }),
          ...(endChanged && { fundingEnd: end }),
        })
        if (!ok) return
      }
      if (titleChanged) {
        const { ok } = await send(`/api/lda-form/${form.id}/title`, "PUT", { title })
        if (!ok) return
      }
      if (startChanged || endChanged || titleChanged) toast.success("Form updated")
      onOpenChange(false)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit form</DialogTitle>
          <DialogDescription>Leave the title empty to use the automatic one (template name and period).</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-form-title">Title</Label>
            <Input
              id="edit-form-title"
              autoFocus
              value={title}
              maxLength={200}
              placeholder="Automatic title"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {(showStart || showEnd) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {showStart && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-form-start">{labels.start}</Label>
                  <Input id="edit-form-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
              )}
              {showEnd && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-form-end">{labels.end}</Label>
                  <Input id="edit-form-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
