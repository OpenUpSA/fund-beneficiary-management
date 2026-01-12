"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation'
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface ManageTabProps {
  ldaId: number
  ldaName: string
  callback: () => void
}

export function ManageTab({ ldaId, ldaName, callback }: ManageTabProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDeleteLDA = async () => {
    setIsDeleting(true)
    const toastId = toast.loading(`Deleting ${LDA_TERMINOLOGY.shortName}...`)

    try {
      const response = await fetch(`/api/lda/${ldaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to delete ${LDA_TERMINOLOGY.shortName}`)
      }

      toast.dismiss(toastId)
      toast.success(`${LDA_TERMINOLOGY.shortName} deleted successfully`)
      callback()
      // Redirect to LDAs dashboard after successful deletion
      router.push(LDA_TERMINOLOGY.dashboardPath)
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : `Failed to delete ${LDA_TERMINOLOGY.shortName}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect this {LDA_TERMINOLOGY.shortName}. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <h4 className="font-semibold text-red-900 mb-2">Delete {LDA_TERMINOLOGY.shortName}</h4>
            <p className="text-sm text-red-700 mb-4">
              This action will permanently delete the {LDA_TERMINOLOGY.shortName} &quot;{ldaName}&quot; and all associated data including:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside mb-4 space-y-1">
              <li>All documents and media files</li>
              <li>Staff and board member information</li>
              <li>User access permissions</li>
              <li>Operations data and history</li>
              <li>All form submissions and reports</li>
            </ul>
            <p className="text-sm text-red-700 font-medium mb-4">
              This action cannot be undone. Please make sure you have backed up any important data.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete this {LDA_TERMINOLOGY.shortName}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                    Are you sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600 mt-2">
                    This action cannot be undone. This will permanently delete the {LDA_TERMINOLOGY.shortName} and all associated data from the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex gap-3 mt-6">
                  <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-900 border-0">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteLDA}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
