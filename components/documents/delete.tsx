"use client"

import { toast } from "@/hooks/use-toast"
import { AlertCircle, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

import { Document } from '@prisma/client'

interface Props {
  document: Document
  callback: () => void
}

export function DeleteDialog({ document, callback }: Props) {
  const router = useRouter()

  const deleteDocument = async () => {
    toast({
      title: 'Deleting document...',
      variant: 'processing'
    })
    await fetch(`/api/document/${document.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    callback()
    router.push('/dashboard/documents')
    toast({
      title: 'Document deleted.',
      variant: 'warning'
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <span className="flex items-center gap-2 hover:cursor-pointer w-full text-destructive"><Trash2 size={10} /> Delete</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Confirm Deletion
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the document {document.title}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={deleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
