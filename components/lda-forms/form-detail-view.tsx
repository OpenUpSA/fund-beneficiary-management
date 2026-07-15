"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar";

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Form, FormData } from "@/types/forms"
import { PenLine, Send, CalendarIcon, Maximize2, Minimize2, Check, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import DynamicForm from "@/components/form-templates/dynamicForm"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { canFillForm, canApproveForm } from "@/lib/permissions"
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
    formTemplate: {
      form: Form | null;
      sidebarConfig?: { amount?: boolean; status?: boolean; startDate?: boolean; endDate?: boolean; dueDate?: boolean } | undefined;
      templateType?: 'APPLICATION' | 'REPORT'
      fillRoles?: string[]
      approveRoles?: string[]
    }
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
  const [focusMode, setFocusMode] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const [completionStatus, setCompletionStatus] = useState({
    completed: 0,
    required: 0
  })
  const [failedSectionTitles, setFailedSectionTitles] = useState<string[]>([])

  // Deep-link from the reporting dashboard: ?section=<index> opens and scrolls to
  // that form section. Ignore anything that isn't a valid in-range section index.
  const searchParams = useSearchParams()
  const sectionCount = ldaForm.formTemplate?.form?.sections?.length ?? 0
  const sectionParam = Number(searchParams.get("section"))
  const initialOpenSection =
    searchParams.get("section") !== null &&
    Number.isInteger(sectionParam) &&
    sectionParam >= 0 &&
    sectionParam < sectionCount
      ? sectionParam
      : undefined
  const initialHighlightField = searchParams.get("field") ?? undefined

  // Focus mode: expand the form to fullscreen for easier filling. Lock body
  // scroll and allow Escape to exit while it's active.
  useEffect(() => {
    if (!focusMode) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false)
    }
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [focusMode])

  const { data: session } = useSession()
  // const { isLDAUser } = usePermissions()

  // Format date with time (12-hour format)
  const formatDateTime = (date: Date | null | undefined) => {
    return date ? format(new Date(date), 'dd MMM yyyy, hh:mma') : 'Not set';
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

  // Whether the current user's role is allowed to fill/edit this form (per template fillRoles)
  const canFill = canFillForm(session?.user ?? null, ldaForm.formTemplate.fillRoles)

  // Whether the current user's role is allowed to approve this form — drives the admin
  // sidebar controls (status, approved amount, funding dates), per template approveRoles
  const canApprove = canApproveForm(session?.user ?? null, ldaForm.formTemplate.approveRoles)

  const updateField = async (field: string, value: string | Date | number | undefined): Promise<boolean> => {
    if (value === undefined) return false; // Don't update if value is undefined
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
        // Context-aware field labels for toast messages
        const isReportType = ldaForm.formTemplate.templateType === 'REPORT'
        const fieldLabels: Record<string, string> = {
          fundingStart: isReportType ? 'Reporting start date' : 'Funding start date',
          fundingEnd: isReportType ? 'Reporting end date' : 'Funding end date',
        }
        const displayName = fieldLabels[field] || field.charAt(0).toUpperCase() + field.slice(1)
        toast.success(`${displayName} updated successfully`)
        dataChanged(ldaForm.localDevelopmentAgencyId, ldaForm.id)
        return true
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update field')
        return false
      }
    } catch {
      toast.error('An unexpected error occurred')
      return false
    }
  }

  const submitForm = async () => {
    // Double-check form validity before submission
    if (!isFormValid) {
      toast.error('Please complete all required fields before submitting')
      return;
    }

    const toastId = toast.loading('Submitting form...')

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
        setFailedSectionTitles([])
        toast.success('Form submitted successfully', { id: toastId })
        dataChanged(ldaForm.localDevelopmentAgencyId, ldaForm.id)
        window.location.reload();
      } else {
        let message = 'Failed to submit form'
        let description: string | undefined
        try {
          const errorData = await response.json() as {
            error?: string
            issues?: Array<{ sectionTitle?: string; fieldLabel?: string; message?: string }>
          }
          if (errorData?.error) message = errorData.error
          if (Array.isArray(errorData?.issues) && errorData.issues.length > 0) {
            // Collect unique section titles that have errors
            const sectionsWithErrors = [...new Set(
              errorData.issues.map(i => i.sectionTitle).filter((t): t is string => Boolean(t))
            )]
            setFailedSectionTitles(sectionsWithErrors)

            // Show sections grouped (no raw field names)
            const previewSections = sectionsWithErrors.slice(0, 3)
            const preview = previewSections.map(title => {
              const count = errorData.issues!.filter(i => i.sectionTitle === title).length
              return `• ${title} (${count} field${count !== 1 ? 's' : ''} incomplete)`
            }).join('\n')
            const remaining = sectionsWithErrors.length - previewSections.length
            description = remaining > 0
              ? `${preview}\n• …and ${remaining} more section${remaining !== 1 ? 's' : ''}`
              : preview
          }
        } catch {
          /* response had no JSON body — keep the default message */
        }
        toast.error(message, {
          id: toastId,
          duration: 10000,
          description: description
            ? <span className="text-foreground whitespace-pre-line text-sm">{description}</span>
            : undefined,
        })
      }
    } catch {  
      toast.error('Error submitting form. Please try again later', { id: toastId })
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
      <Card
        className={cn(
          "col-span-7 h-fit",
          focusMode &&
            "fixed inset-0 z-50 col-span-10 m-0 h-full overflow-y-auto rounded-none border-0 bg-muted shadow-none"
        )}
      >
        <CardHeader
          className={cn(
            "border-b pb-2 grid grid-cols-2 items-center p-4 min-h-[79px]",
            focusMode && "sticky top-0 z-20 bg-card"
          )}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-slate-900">{focusMode ? ldaForm.title : getFormTypeName()}</h2>
            {focusMode && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span>
                    <strong className="text-foreground">{completionStatus.completed}</strong>/
                    {completionStatus.required} required fields
                  </span>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-green-600 transition-all"
                      style={{
                        width: `${
                          completionStatus.required > 0
                            ? Math.round((completionStatus.completed / completionStatus.required) * 100)
                            : 100
                        }%`,
                      }}
                    />
                  </span>
                </span>
                {ldaForm.formTemplate.sidebarConfig?.dueDate && ldaForm.dueDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Due {formatDateTime(ldaForm.dueDate)} ({getDaysBetweenDates(ldaForm.dueDate)})
                  </span>
                )}
                {ldaForm.formStatus?.label && (
                  <span>Status: <strong className="text-foreground">{ldaForm.formStatus.label}</strong></span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end items-center">
            {ldaForm.formStatus?.label === "Draft" && !isEditing && canFill && (
              <Button onClick={() => setIsEditing(true)}>
                <PenLine className="h-4 w-4" />
                <span>Edit form</span>
              </Button>
            )}
            {ldaForm.formStatus?.label === "Draft" && !isEditing && canFill && (
              <Button
                onClick={submitForm}
                disabled={!isFormValid}
                variant="secondary"
                className={isFormValid ? "bg-green-600 text-white hover:bg-green-700" : "bg-slate-100 text-slate-400"}
              >
                <Send className="h-4 w-4" />
                <span>Submit form</span>
              </Button>
            )}
            {focusMode && isEditing && (
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                <Check className="h-4 w-4" />
                <span>Done</span>
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFocusMode((v) => !v)}
                    aria-label={focusMode ? "Exit focus mode" : "Focus mode"}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{focusMode ? "Exit focus mode" : "Focus mode"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Preview button disabled
            {ldaForm.formStatus?.label !== "Draft" && !isEditing && (
              <Button variant="outline" asChild>
                <a href={`/form-preview/${ldaForm.id}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </a>
              </Button>
            )}
            */}
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            "p-0",
            focusMode &&
              "mx-auto w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-lg border bg-card shadow-sm min-h-full my-4"
          )}
        >
          {ldaForm.formTemplate.form ? (
              <DynamicForm
                form={ldaForm.formTemplate.form}
                defaultValues={ldaForm.formData as Record<string, string>}
                isEditing={isEditing}
                setParentEditing={setIsEditing}
                formId={ldaForm.id}
                lda_id={ldaForm?.localDevelopmentAgencyId}
                userRole={session?.user?.role}
                formStatus={ldaForm.formStatus?.label}
                setIsFormValid={setIsFormValid}
                setCompletionStatus={setCompletionStatus}
                dataChanged={dataChanged}
                failedSectionTitles={failedSectionTitles}
                focusMode={focusMode}
                initialOpenSection={initialOpenSection}
                initialHighlightField={initialHighlightField}
              />
          ) : (
            <p className="text-muted-foreground">Form template not available</p>
          )}
        </CardContent>
      </Card>
      
      {/* Application Admin Card */}
      <Card className={cn("col-span-3 h-fit", focusMode && "hidden")}>
        <CardHeader className="pb-2 border-b grid items-center p-4 py-6">
          <h2 className="text-lg font-bold text-slate-900">Application Admin</h2>
        </CardHeader>
        <CardContent className="space-y-6 p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Required fields completed:</p>
              <p className="text-sm">{completionStatus.completed}/{completionStatus.required}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Created by:</p>
              <p className="text-sm">{ldaForm.createdBy?.name || '-'}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date created:</p>
              <p className="text-sm">{formatDateTime(ldaForm.createdAt)}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Last updated:</p>
              <p className="text-sm">{formatDateTime(ldaForm.updatedAt)}</p>
            </div>
            
            {ldaForm.formTemplate.sidebarConfig?.dueDate && ldaForm.dueDate && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Date due:</p>
                <p className="text-sm">{ldaForm.dueDate ? `${formatDateTime(ldaForm.dueDate)} (${getDaysBetweenDates(ldaForm.dueDate)})` : '-'}</p>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date submitted:</p>
              <p className="text-sm">{ldaForm.submitted ? 
                  (typeof ldaForm.submitted === 'boolean' ? 'Yes' : formatDateTime(ldaForm.submitted)) : 
                  '-'}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Date approved:</p>
              <p className="text-sm">{ldaForm.approved ? 
                  (typeof ldaForm.approved === 'boolean' ? 'Yes' : formatDateTime(ldaForm.approved)) : 
                  '-'}</p>
            </div>
          </div>
          
          {(ldaForm.formTemplate.sidebarConfig?.status || ldaForm.formTemplate.sidebarConfig?.amount || ldaForm.formTemplate.sidebarConfig?.startDate || ldaForm.formTemplate.sidebarConfig?.endDate) && (
            <div className="border-t pt-6 space-y-4">
              {ldaForm.formTemplate.sidebarConfig?.status && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Application status:</p>
                  <Controller
                    name="formStatusLabel"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={field.value}
                        onValueChange={async (value) => {
                          const previousValue = field.value
                          field.onChange(value)
                          if (canApprove) {
                            const success = await updateField('formStatusLabel', value)
                            if (!success) {
                              // Revert to previous value on failure
                              field.onChange(previousValue)
                            }
                          }
                        }}
                        disabled={!canApprove}
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
              )}
              
              {ldaForm.formTemplate.sidebarConfig?.amount && (
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
                          disabled={!canApprove}
                          className={errors.amount ? "border-red-500" : ""}
                          onBlur={() => {
                            if (canApprove) {
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
              )}
              
              {ldaForm.formTemplate.sidebarConfig?.startDate && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{ldaForm.formTemplate.templateType === 'REPORT' ? 'Reporting start date:' : 'Funding start date:'}</p>
                  <Controller
                    name="fundingStart"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                            disabled={!canApprove}
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
              )}
              
              {ldaForm.formTemplate.sidebarConfig?.endDate && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{ldaForm.formTemplate.templateType === 'REPORT' ? 'Reporting end date:' : 'Funding end date:'}</p>
                  <Controller
                    name="fundingEnd"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                            disabled={!canApprove}
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
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
