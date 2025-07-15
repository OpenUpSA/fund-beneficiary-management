"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Form, FormData } from "@/types/forms"
import {PenLine, Send} from "lucide-react"
import DynamicForm from "@/components/form-templates/dynamicForm"
import { toast } from "@/hooks/use-toast"
import { JsonValue } from "@prisma/client/runtime/library"
import { useSession } from "next-auth/react"

interface LDAFormDetailViewProps {
  ldaForm: {
    id: number | string
    title: string
    formData: FormData | Record<string, unknown>
    formTemplate: { form: Form | null }
    formStatus?: { id: number; label: string; icon: string; createdAt: Date; updatedAt: Date }
    createdAt: Date
    updatedAt: Date
    submitted?: boolean | Date
    approved?: boolean | Date
    dueDate?: Date | null
    amount?: number | string
  }
}

export default function LDAFormDetailView({ ldaForm }: LDAFormDetailViewProps) {

  const [isEditing, setIsEditing] = useState(false)
  const isFormValid = true
  const { data: session } = useSession()
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-gray-200 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  // Format date or show placeholder
  const formatDate = (date: Date | null | undefined) => {
    return date ? format(new Date(date), 'dd MMM yyyy') : 'Not set';
  };
  
  const submitForm = async () => {
    // Double-check form validity before submission
    if (!isFormValid) {
      toast({
        title: 'Form validation failed',
        description: 'Please complete all required fields before submitting',
        variant: 'destructive'
      })
      return;
    }

    toast({
      title: 'Submitting form...',
      variant: 'processing'
    })
    
    try {
      const updatedFormData: { formData: JsonValue; submitted: boolean } = { 
        formData: ldaForm.formData as unknown as JsonValue,
        submitted: true
      }
      await fetch(`/api/lda-form/${ldaForm.id}/submit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFormData),
      })
      toast({
        title: 'Form submitted successfully',
        variant: 'success'
      })
      
      // Refresh the form data after successful submission
      window.location.reload();
    } catch {  // Removed unused variable
      toast({
        title: 'Error submitting form',
        description: 'Please try again later',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="grid grid-cols-10 gap-4">
      {/* Application Form Card */}
      <Card className="col-span-7 h-fit">
        <CardHeader className="border-b pb-2 grid grid-cols-2 items-center p-4">
          <h2 className="text-lg font-bold text-slate-900">Application Form</h2>
          <div className="flex gap-2 justify-end">
            {!isEditing && <Button onClick={() => setIsEditing(true)}>
              <PenLine className="mr-2 h-4 w-4" />
              <span>Edit form</span>
            </Button>}
            {!isEditing && <Button 
              onClick={submitForm} 
              disabled={!isFormValid} 
              variant="secondary" 
              className={isFormValid ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400"}
            >
              <Send className="mr-2 h-4 w-4" />
              <span>Submit form</span>
            </Button>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ldaForm.formTemplate.form ? (
              <DynamicForm
                form={ldaForm.formTemplate.form}
              defaultValues={ldaForm.formData as Record<string, string>}
                isEditing={isEditing}
                setParentEditing={setIsEditing}
                formId={ldaForm.id}
                userRole={session?.user?.role}
              />
          ) : (
            <p className="text-muted-foreground">Form template not available</p>
          )}
        </CardContent>
      </Card>
      
      {/* Application Admin Card */}
      <Card className="col-span-3 h-fit">
        <CardHeader className="pb-2 border-b grid items-center p-4 py-6">
          <h2 className="text-lg font-bold text-slate-900">Application Admin</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={getStatusColor(ldaForm.formStatus?.label || 'Draft')}>
                {ldaForm.formStatus?.label || 'Draft'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created by</p>
                <p>{'James Smith'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Date created</p>
                <p>{formatDate(ldaForm.createdAt)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Last updated</p>
                <p>{formatDate(ldaForm.updatedAt)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Date due</p>
                <p>{formatDate(ldaForm.dueDate)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Date submitted</p>
                <p>{ldaForm.submitted ? 
                    (typeof ldaForm.submitted === 'boolean' ? 'Yes' : formatDate(ldaForm.submitted as Date)) : 
                    '-'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Date approved</p>
                <p>{ldaForm.approved ? 
                    (typeof ldaForm.approved === 'boolean' ? 'Yes' : formatDate(ldaForm.approved as Date)) : 
                    '-'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Application status</p>
                <p>Draft</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Approved amount</p>
                <p>R {ldaForm.amount || '120,000'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Funding start date</p>
                <p>1 Jan, 2026</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Funding end date</p>
                <p>31 Dec, 2026</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
