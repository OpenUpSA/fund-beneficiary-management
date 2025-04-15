"use client"

import { toast } from "@/hooks/use-toast"
import { CircleXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

import { FormTemplate } from '@prisma/client'

interface Props {
  formTemplate: FormTemplate
  callback: () => void
}

export function DeleteDialog({ formTemplate, callback }: Props) {
  const router = useRouter()

  const deleteFormTemplate = async () => {
    toast({
      title: 'Deleting form template...',
      variant: 'processing'
    })
    await fetch(`/api/form-template/${formTemplate.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    callback()
    router.push('/dashboard/form-templates')
    toast({
      title: 'Form template deleted.',
      variant: 'warning'
    })
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
