"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Form, FormData } from "@/types/forms"
import {PenLine, Send, CalendarIcon} from "lucide-react"
import DynamicForm from "@/components/form-templates/dynamicForm"
import { toast } from "@/hooks/use-toast"
import { JsonValue } from "@prisma/client/runtime/library"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select"

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
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Required fields completed:</p>
              <p className="font-medium">12/24</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Created by:</p>
              <p className="font-medium">James Smith</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date created:</p>
              <p className="font-medium">{formatDate(ldaForm.createdAt)}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Last updated:</p>
              <p className="font-medium">{formatDate(ldaForm.updatedAt)}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date due:</p>
              <p className="font-medium">{ldaForm.dueDate ? `${formatDate(ldaForm.dueDate)} (10 days away)` : '15 July, 2025 (10 days away)'}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date submitted</p>
              <p className="font-medium">{ldaForm.submitted ? 
                  (typeof ldaForm.submitted === 'boolean' ? 'Yes' : formatDate(ldaForm.submitted as Date)) : 
                  '-'}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date approved:</p>
              <p className="font-medium">{ldaForm.approved ? 
                  (typeof ldaForm.approved === 'boolean' ? 'Yes' : formatDate(ldaForm.approved as Date)) : 
                  '-'}</p>
            </div>
          </div>
          
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Application status:</p>
              <Select defaultValue={ldaForm.formStatus?.label || "draft"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Approved amount:</p>
              <Input placeholder="R 0.00" defaultValue={`R ${ldaForm.amount || '120,000'}`} />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Funding start date:</p>
              <div className="relative">
                <Input placeholder="Select date" defaultValue="1 Jan, 2026" />
                <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Funding end date:</p>
              <div className="relative">
                <Input placeholder="Select date" defaultValue="31 Dec, 2026" />
                <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
