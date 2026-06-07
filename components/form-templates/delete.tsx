"use client"

import { toast } from "sonner"
import { CircleXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

import { FormTemplate } from '@prisma/client'

interface Props {
  formTemplate: FormTemplate
}

export function DeleteDialog({ formTemplate }: Props) {
  const router = useRouter()

  const deleteFormTemplate = async () => {
    const toastId = toast.loading('Deleting form template...')
    await fetch(`/api/form-template/${formTemplate.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    router.push('/dashboard/form-templates')
    toast.warning('Form template deleted.', { id: toastId })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <span className="hidden md:inline">Delete</span>
          <CircleXIcon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this form template.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={deleteFormTemplate}>Yes, delete form template</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
