"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { FormStatus, LocalDevelopmentAgencyForm } from '@prisma/client'
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

interface FormDialogProps {
  formTemplates: FormTemplateWithRelations[]
  formStatuses: FormStatus[],
  ldaForm?: LocalDevelopmentAgencyForm,
  lda?: LocalDevelopmentAgencyFull,
  ldas?: LocalDevelopmentAgencyFull[],
  callback: (tag: string) => void
}

const FormSchema = z.object({
  title: z.string().min(2, { message: "Name must be at least 2 characters." }),
  localDevelopmentAgencyId: z.coerce.number({ required_error: "Please select a local development agency." }),
  formStatusId: z.coerce.number({ required_error: "Please select a form status." }),
  formTemplateId: z.coerce.number({ required_error: "Please select a form templte." }),
  dueDate: z.date({ required_error: "Please select a due date." }).refine(date => date !== undefined, {
    message: "Due date is required."
  }),
  submitted: z.date({ required_error: "Please select a submitted date." }).refine(date => date !== undefined, {
    message: "Submitted date is required."
  }),
  approved: z.date({ required_error: "Please select an approved date." }).refine(date => date !== undefined, {
    message: "Approved date is required."
  }),
  formData: z.object({})
})

export function FormDialog({ ldaForm, formTemplates, lda, ldas, formStatuses, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: ldaForm ? ldaForm.title : "",
      localDevelopmentAgencyId: ldaForm ? ldaForm.localDevelopmentAgencyId : lda ? lda.id : 0,
      formStatusId: ldaForm ? ldaForm.formStatusId : formStatuses[0].id,
      formTemplateId: ldaForm ? ldaForm.formTemplateId : 0,
      dueDate: ldaForm ? new Date(ldaForm.dueDate) : new Date(),
      submitted: ldaForm ? new Date(ldaForm.submitted) : new Date(),
      approved: ldaForm ? new Date(ldaForm.approved) : new Date(),
      formData: ldaForm?.formData ? ldaForm.formData : {},
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    if (ldaForm) {
      toast({
        title: 'Updating form...',
        variant: 'processing'
      })
      await fetch(`/api/lda-form/${ldaForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Form updated',
        variant: 'success'
      })
    } else {
      toast({
        title: 'Adding form...',
        variant: 'processing'
      })
      await fetch(`/api/lda-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Form added',
        variant: 'success'
      })
    }

    callback('ldas')
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
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>{ldaForm ? "Edit" : "Add"} Form</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>

                </FormItem>
              )}
            />

            {ldas &&
              <FormField
                control={form.control}
                name="localDevelopmentAgencyId"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Local Development Agency</FormLabel>
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
                      {formTemplates.map((lda) => (
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

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="submitted"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Submitted</FormLabel>
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                  </FormItem>
                )}
              />

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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="submitted"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Approved</FormLabel>
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="formStatusId"
              render={({ field }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel>Funding Status</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {formStatuses.map((formStatus) => (
                        <SelectItem
                          key={formStatus.id}
                          value={formStatus.id.toString()}
                        >
                          {formStatus.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                </FormItem>
              )} />

          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{ldaForm ? "Save changes" : "Add Form"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
