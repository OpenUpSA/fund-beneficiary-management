"use client"

import { toast } from "sonner"
import { CircleXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

import { LocalDevelopmentAgencyForm } from '@prisma/client'

interface Props {
  ldaForm: LocalDevelopmentAgencyForm
  callback: (ldaId?: number) => void
}

export function DeleteDialog({ ldaForm, callback }: Props) {
  const router = useRouter()

  const deleteLDAForm = async () => {
    const toastId = toast.loading('Deleting form...')
    await fetch(`/api/lda-form/${ldaForm.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    callback(ldaForm.localDevelopmentAgencyId)
    router.push('/dashboard/applications-reports')
    toast.warning('Form deleted.', { id: toastId })
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
            This action cannot be undone. This will permanently delete this form.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={deleteLDAForm}>Yes, delete form</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
