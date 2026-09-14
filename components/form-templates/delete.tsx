"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { AlertCircle, CircleXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "@/i18n/routing"

import { FormTemplate } from '@prisma/client'

interface Props {
  formTemplate: FormTemplate
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteDialog({ formTemplate, open: controlledOpen, onOpenChange, onDeleted }: Props) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [usageCount, setUsageCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const open = controlledOpen ?? internalOpen

  const setOpen = (value: boolean) => {
    if (isDeleting) return
    setInternalOpen(value)
    onOpenChange?.(value)
  }

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setUsageCount(null)
    setError(null)

    const loadUsage = async () => {
      try {
        const response = await fetch(`/api/form-template/${formTemplate.id}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to check template usage")
        if (!Array.isArray(data.localDevelopmentAgencyForms)) {
          throw new Error("Failed to check template usage")
        }
        if (!controller.signal.aborted) setUsageCount(data.localDevelopmentAgencyForms.length)
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Failed to check template usage")
        }
      }
    }

    void loadUsage()
    return () => controller.abort()
  }, [open, formTemplate.id])

  const deleteFormTemplate = async () => {
    if (isDeleting || usageCount !== 0) return
    setIsDeleting(true)
    setError(null)
    const toastId = toast.loading('Deleting form template...')
    try {
      const response = await fetch(`/api/form-template/${formTemplate.id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        if (typeof data?.usageCount === "number") setUsageCount(data.usageCount)
        throw new Error(data?.error || "Failed to delete form template")
      }
      setInternalOpen(false)
      onOpenChange?.(false)
      if (onDeleted) onDeleted()
      else router.push('/dashboard/form-templates')
      router.refresh()
      toast.success('Form template deleted.', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete form template"
      setError(message)
      toast.error(message, { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <span className="hidden md:inline">Delete</span>
          <CircleXIcon />
        </Button>
      </AlertDialogTrigger>}
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Confirm Deletion
          </AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            Are you sure you want to delete the template <strong>{formTemplate.name}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground" aria-live="polite">
          {usageCount === null ? (
            <p>{error ? "Template usage could not be verified. Close this dialog and try again." : "Checking template usage..."}</p>
          ) : (
            <>
              <p><strong>{usageCount}</strong> {usageCount === 1 ? "form uses" : "forms use"} this template.</p>
              {usageCount > 0 ? (
                <p>This template cannot be deleted while forms use it. All existing forms and their responses will remain unchanged. You can deactivate the template instead.</p>
              ) : (
                <p>No existing forms will be deleted. This permanently deletes the template, removes links from other templates, and deletes any associated report scheduling configurations and period schedules. This action cannot be undone.</p>
              )}
            </>
          )}
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void deleteFormTemplate()
            }}
            disabled={isDeleting || usageCount !== 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
