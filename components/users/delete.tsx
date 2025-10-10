"use client"

import { toast } from "@/hooks/use-toast"
import { CircleXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"

import { User } from '@prisma/client'

interface Props {
  user: User
  callback: () => void
}

export function DeleteDialog({ user, callback }: Props) {
  const router = useRouter()
  const { canDeleteSpecificUser } = usePermissions()
  
  // Check if current user can delete this user
  const canDelete = canDeleteSpecificUser(user)

  const deleteUser = async () => {
    toast({
      title: 'Deleting user...',
      variant: 'processing'
    })
    await fetch(`/api/user/${user.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    callback()
    router.push('/dashboard/users')
    toast({
      title: 'User deleted.',
      variant: 'warning'
    })
  }

  // Don't render delete button if user doesn't have delete permissions
  if (!canDelete) {
    return null
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
            This action cannot be undone. This will permanently delete this user.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={deleteUser}>Yes, delete user</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
