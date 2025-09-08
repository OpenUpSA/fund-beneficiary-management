"use client"

import { toast } from "@/hooks/use-toast"
import { Trash2, AlertCircle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

import { Media } from '@prisma/client'

interface Props {
  media: Media
  callback: () => void
}

export function DeleteDialog({ media, callback }: Props) {
  const deleteMedia = async () => {
    toast({
      title: 'Deleting media...',
      variant: 'processing'
    })
    await fetch(`/api/media/${media.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    callback()
    toast({
      title: 'Media deleted.',
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
          Are you sure you want to delete the media {media.title}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={deleteMedia} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
