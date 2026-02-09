"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { LocalDevelopmentAgencyForm } from '@prisma/client'
import { FormTemplateWithRelations, LocalDevelopmentAgencyFull } from '@/types/models'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { format } from "date-fns"
import { Calendar } from "../ui/calendar";
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface FormDialogProps {
  formTemplates: FormTemplateWithRelations[]
  ldaForm?: LocalDevelopmentAgencyForm,
  lda?: LocalDevelopmentAgencyFull,
  ldas?: LocalDevelopmentAgencyFull[],
  callback: (ldaId?: number) => void
}

const FormSchema = z.object({
  // title: z.string().optional(),
  localDevelopmentAgencyId: z.coerce.number({ required_error: "Please select a local development agency." }),
  formTemplateId: z.coerce.number({ required_error: "Please select a form templte." }),
  dueDate: z.date().optional().nullable(),
  fundingStart: z.date().optional().nullable(),
  fundingEnd: z.date().optional().nullable(),
  formData: z.object({})
})

export function FormDialog({ ldaForm, formTemplates, lda, ldas, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      // title: ldaForm ? ldaForm.title : "",
      localDevelopmentAgencyId: ldaForm ? ldaForm.localDevelopmentAgencyId : lda ? lda.id : 0,
      formTemplateId: ldaForm ? ldaForm.formTemplateId : 0,
      dueDate: ldaForm?.dueDate ? new Date(ldaForm.dueDate) : undefined,
      fundingStart: ldaForm?.fundingStart ? new Date(ldaForm.fundingStart) : undefined,
      fundingEnd: ldaForm?.fundingEnd ? new Date(ldaForm.fundingEnd) : undefined,
      formData: ldaForm?.formData ? ldaForm.formData : {},
    },
  })

  // Watch formTemplateId to get selected template's sidebarConfig
  const selectedTemplateId = form.watch('formTemplateId')
  const selectedTemplate = formTemplates.find(t => t.id === Number(selectedTemplateId))
  const sidebarConfig = selectedTemplate?.sidebarConfig as { startDate?: boolean; endDate?: boolean; dueDate?: boolean } | null

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)
    let toastId: string | number | undefined
    
    try {
      if (ldaForm) {
        // Show updating toast
        toastId = toast.loading('Updating form...')
        const response = await fetch(`/api/lda-form/${ldaForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update form')
        }
        
        toast.dismiss(toastId)
        toast.success('Form updated successfully')
        callback(ldaForm.localDevelopmentAgencyId)
      } else {
        // Show saving toast for new form
        toastId = toast.loading('Adding form...')
        const response = await fetch(`/api/lda-form`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!response.ok) {
          throw new Error('Failed to add form')
        }
        callback(data.localDevelopmentAgencyId)
        toast.dismiss(toastId)
        toast.success('Form added successfully')
      }
      
    } catch (error) {
      if (toastId) toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          {ldaForm ? <>
            <span className="hidden md:inline">Edit details</span>
            <PencilIcon />
          </>
            : <>
              <PlusIcon />
              <span className="hidden md:inline">New Application</span>
              
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>{ldaForm ? "Edit" : "Add"} Form</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow contents">
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            {ldas &&
              <FormField
                control={form.control}
                name="localDevelopmentAgencyId"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>{LDA_TERMINOLOGY.fullName}</FormLabel>
                    <Select value={field.value?.toString()} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ldas.map((lda) => (
                          <SelectItem
                            key={lda.id}
                            value={lda.id.toString()}
                          >
                            {lda.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                  </FormItem>
                )} />}

            {!ldaForm && <FormField
              control={form.control}
              name="formTemplateId"
              render={({ field }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel>Form Template</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {formTemplates
                        .filter(template => template.active === true && template.templateType !== 'REPORT')
                        .map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                </FormItem>
              )} />}

            {(sidebarConfig?.startDate || sidebarConfig?.endDate || sidebarConfig?.dueDate) && (
              <div className="flex flex-col gap-4 md:flex-row">
                {sidebarConfig?.startDate && (
                  <FormField
                    control={form.control}
                    name="fundingStart"
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel>Funding Start</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                )}

                {sidebarConfig?.endDate && (
                  <FormField
                    control={form.control}
                    name="fundingEnd"
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel>Funding End</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                )}

                {sidebarConfig?.dueDate && (
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel>Due</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            </div>

          </form>
        </Form>
        <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-6 pb-6 pt-4 border-t mt-auto">
          <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">Cancel</Button>
          <Button 
            type="button" 
            onClick={form.handleSubmit(onSubmit)}
            className="sm:order-2 order-1"
          >
            {ldaForm ? "Save changes" : "Add Form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
