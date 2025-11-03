"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar";

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Form, FormData } from "@/types/forms"
import {PenLine, Send, CalendarIcon} from "lucide-react"
import DynamicForm from "@/components/form-templates/dynamicForm"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
// import { usePermissions } from "@/hooks/use-permissions"
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
    submitted?: boolean | Date | null
    approved?: boolean | Date | null
    dueDate?: Date | null
    amount?: number
    fundingStart?: Date | null
    fundingEnd?: Date | null
    localDevelopmentAgencyId?: number
    createdBy?: { name: string }
  }
  dataChanged: (ldaId?: number, applicationId?: string | number) => Promise<void>
}

const FormSchema = z.object({
  formStatusLabel: z.string(),
  amount: z.string().regex(/^R\s?[0-9,]*(\.[0-9]{1,2})?$/, {
    message: "Amount must be in format R 0.00",
  }),
  fundingStart: z.date().optional(),
  fundingEnd: z.date().optional(),
})

type FormValues = z.infer<typeof FormSchema>

export default function LDAFormDetailView({ ldaForm, dataChanged }: LDAFormDetailViewProps) {

  const [isEditing, setIsEditing] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const [completionStatus, setCompletionStatus] = useState({
    completed: 0,
    required: 0
  })

  const { data: session } = useSession()
  // const { isLDAUser } = usePermissions()

  // Format date or show placeholder
  const formatDate = (date: Date | null | undefined) => {
    return date ? format(new Date(date), 'dd MMM yyyy') : 'Not set';
  };

  const { control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      formStatusLabel: ldaForm.formStatus?.label || '',
      amount: `R ${ldaForm.amount || 0}`,
      fundingStart: ldaForm.fundingStart ? new Date(ldaForm.fundingStart) : undefined,
      fundingEnd: ldaForm.fundingEnd ? new Date(ldaForm.fundingEnd) : undefined
    }
  })

  const canEditAmountAndStatus = session?.user?.role === 'ADMIN' || session?.user?.role === 'PROGRAMME_OFFICER'

  const updateField = async (field: string, value: string | Date | number | undefined) => {
    if (value === undefined) return; // Don't update if value is undefined
    try {
      // Prepare data based on field type
      const data: Record<string, string | Date | number> = {}
      
      if (field === 'formStatusId') {
        // Find the status label from the formStatuses array
        const statusLabel = ldaForm.formStatus?.label || ''
        data.formStatus = statusLabel
      } else {
        data[field] = value
      }
      
      const response = await fetch(`/api/lda-form/${ldaForm.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        toast({
          title: 'Updated',
          description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`,
        })
        dataChanged(ldaForm.localDevelopmentAgencyId, ldaForm.id)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update field',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

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
      // Then submit the form
      const updatedFormData: { submitted: boolean } = { 
        submitted: true
      }
      const response = await fetch(`/api/lda-form/${ldaForm.id}/submit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFormData),
      })
      
      if (response.ok) {
        toast({
          title: 'Form submitted successfully',
          variant: 'success'
        })
        
        // Call dataChanged to revalidate data if provided
        dataChanged(ldaForm.localDevelopmentAgencyId, ldaForm.id)
        // Refresh the form data after successful submission
        window.location.reload();
      }
    } catch {  
      toast({
        title: 'Error submitting form',
        description: 'Please try again later',
        variant: 'destructive'
      })
    }
  }

  const getDaysBetweenDates = (date: Date) => {
    const today = new Date()
    const diffTime = Math.abs(new Date(date).getTime() - today.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays > 1) {
      return `${diffDays} days away`
    } else if (diffDays === 1) {
      return 'Tomorrow'
    } else if (diffDays === 0) {
      return 'Today'
    } else {
      return `${Math.abs(diffDays)} days overdue`
    }
  }
  
  const getFormTypeName = () => {
    if (ldaForm?.title.toLowerCase().includes("application")) {
      return 'Application Form'
    } else {
      return 'Form'
    }
  }

  return (
    <div className="grid grid-cols-10 gap-4">
      {/* Application Form Card */}
      <Card className="col-span-7 h-fit">
        <CardHeader className="border-b pb-2 grid grid-cols-2 items-center p-4">
          <h2 className="text-lg font-bold text-slate-900">{getFormTypeName()}</h2>
          {ldaForm.formStatus?.label === "Draft" && <div className="flex gap-2 justify-end">
            {!isEditing && <Button onClick={() => setIsEditing(true)}>
              <PenLine className="h-4 w-4" />
              <span>Edit form</span>
            </Button>}
            {!isEditing && <Button 
              onClick={submitForm} 
              disabled={!isFormValid} 
              variant="secondary" 
              className={isFormValid ?
                "bg-green-600 text-white hover:bg-green-700"
                : "bg-slate-100 text-slate-400"
              }
            >
              <Send className="h-4 w-4" />
              <span>Submit form</span>
            </Button>}
          </div>}
        </CardHeader>
        <CardContent className="p-0">
          {ldaForm.formTemplate.form ? (
              <DynamicForm
                form={ldaForm.formTemplate.form}
                defaultValues={ldaForm.formData as Record<string, string>}
                isEditing={isEditing}
                setParentEditing={setIsEditing}
                formId={ldaForm.id}
                lda_id={ldaForm?.localDevelopmentAgencyId}
                userRole={session?.user?.role}
                setIsFormValid={setIsFormValid}
                setCompletionStatus={setCompletionStatus}
                dataChanged={dataChanged}
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
              <p className="font-medium">{completionStatus.completed}/{completionStatus.required}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Created by:</p>
              <p className="font-medium">{ldaForm.createdBy?.name || '-'}</p>
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
              <p className="font-medium">{ldaForm.dueDate ? `${formatDate(ldaForm.dueDate)} (${getDaysBetweenDates(ldaForm.dueDate)})` : '-'}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date submitted</p>
              <p className="font-medium">{ldaForm.submitted ? 
                  (typeof ldaForm.submitted === 'boolean' ? 'Yes' : formatDate(ldaForm.submitted)) : 
                  '-'}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date approved:</p>
              <p className="font-medium">{ldaForm.approved ? 
                  (typeof ldaForm.approved === 'boolean' ? 'Yes' : formatDate(ldaForm.approved)) : 
                  '-'}</p>
            </div>
          </div>
          
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Application status:</p>
              <Controller
                name="formStatusLabel"
                control={control}
                render={({ field }) => (
                  <Select 
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      if (canEditAmountAndStatus) {
                        updateField('formStatusLabel', value)
                      }
                    }}
                    disabled={!canEditAmountAndStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="draft" value="Draft">Draft</SelectItem>
                      <SelectItem key="under_review" value="UnderReview">Under Review</SelectItem>
                      <SelectItem key="paused" value="Paused">Paused</SelectItem>
                      <SelectItem key="approved" value="Approved">Approved</SelectItem>
                      <SelectItem key="rejected" value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Approved amount:</p>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <>
                    <Input 
                      {...field} 
                      placeholder="R 0.00" 
                      disabled={!canEditAmountAndStatus}
                      className={errors.amount ? "border-red-500" : ""}
                      onBlur={() => {
                        if (canEditAmountAndStatus) {
                          updateField('amount', field.value)
                        }
                      }}
                    />
                    {errors.amount && (
                      <p className="text-xs text-red-500">{errors.amount.message}</p>
                    )}
                  </>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Funding start date:</p>
              <Controller
                name="fundingStart"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date: Date | undefined) => {
                          field.onChange(date)
                          if (date) {
                            updateField('fundingStart', date)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Funding end date:</p>
              <Controller
                name="fundingEnd"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date: Date | undefined) => {
                          field.onChange(date)
                          if (date) {
                            updateField('fundingEnd', date)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
