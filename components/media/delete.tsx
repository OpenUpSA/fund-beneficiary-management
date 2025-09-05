"use client"

import { toast } from "@/hooks/use-toast"
import { CircleXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

import { Media } from '@prisma/client'

interface Props {
  media: Media
  callback: (media_id?: string) => void
}

export function DeleteDialog({ media, callback }: Props) {
  const router = useRouter()

  const deleteMedia = async () => {
    toast({
      title: 'Deleting media...',
      variant: 'processing'
    })
    await fetch(`/api/media/${media.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    callback(media.id.toString())
    router.push('/dashboard/media')
    toast({
      title: 'Media deleted.',
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
            This action cannot be undone. This will permanently delete this media item.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={deleteMedia}>Yes, delete media</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
