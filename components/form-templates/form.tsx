"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { FormTemplate } from "@prisma/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  active: z.boolean(),
  description: z.string().min(2, { message: "Description must be at least 2 characters." }),
  templateType: z.enum(['APPLICATION', 'REPORT']),
  linkedFormTemplateId: z.number().nullable().optional(),
  includeAdminFeedback: z.boolean(),
  sidebarConfig: z.object({
    amount: z.boolean(),
    status: z.boolean(),
    startDate: z.boolean(),
    endDate: z.boolean(),
    dueDate: z.boolean(),
  }),
})

interface FormDialogProps {
  formTemplate?: FormTemplate
  allTemplates?: FormTemplate[]
}

export function FormDialog({ formTemplate, allTemplates = [] }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const defaultSidebarConfig = { amount: true, status: true, startDate: true, endDate: true, dueDate: true }
  const parsedSidebarConfig = formTemplate?.sidebarConfig 
    ? (typeof formTemplate.sidebarConfig === 'string' 
        ? JSON.parse(formTemplate.sidebarConfig) 
        : formTemplate.sidebarConfig)
    : defaultSidebarConfig

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: formTemplate ? formTemplate.name : "",
      active: formTemplate ? formTemplate.active : true,
      description: formTemplate ? formTemplate.description : "",
      templateType: formTemplate?.templateType || 'APPLICATION',
      linkedFormTemplateId: formTemplate?.linkedFormTemplateId || null,
      includeAdminFeedback: formTemplate?.includeAdminFeedback || false,
      sidebarConfig: parsedSidebarConfig,
    },
  })

  // Filter templates for linking (exclude self)
  const availableTemplatesForLinking = allTemplates.filter(t => 
    t.id !== formTemplate?.id
  )

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    if (formTemplate) {
      toast({
        title: 'Updating form template...',
        variant: 'processing'
      })
      await fetch(`/api/form-template/${formTemplate?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Form template updated',
        variant: 'success'
      })
    } else {
      toast({
        title: 'Creating form template...',
        variant: 'processing'
      })
      await fetch(`/api/form-template/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Form template created',
        variant: 'success'
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {formTemplate ? <>
            <span className="hidden md:inline">Edit details</span>
            <PencilIcon />
          </>
            : <>
              <span className="hidden md:inline">Create form template</span>
              <PlusIcon />
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>{formTemplate ? "Edit" : "Create"} form template</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow contents">
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>

                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea rows={5} className="resize-none" {...field} />
                  </FormControl>

                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APPLICATION">Application</SelectItem>
                      <SelectItem value="REPORT">Report</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedFormTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Form Template</FormLabel>
                  <Select 
                    value={field.value?.toString() || 'none'} 
                    onValueChange={(val) => field.onChange(val === 'none' ? null : parseInt(val))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select form template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableTemplatesForLinking.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange}/>
                </FormControl>
                <FormLabel className="font-normal">Active</FormLabel>
              </FormItem>
            )} />

            <FormField
              control={form.control}
              name="includeAdminFeedback"
              render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange}/>
                </FormControl>
                <FormLabel className="font-normal">Include Admin Feedback</FormLabel>
              </FormItem>
            )} />

            <div className="rounded-md border p-4 space-y-3">
              <Label className="text-sm font-medium">Sidebar Configs</Label>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sidebarConfig.amount"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Amount</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sidebarConfig.status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Status</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sidebarConfig.startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Start Date</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sidebarConfig.endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">End Date</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sidebarConfig.dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Due Date</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            </div>
            <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
              <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">Cancel</Button>
              <Button type="submit" className="sm:order-2 order-1">{formTemplate ? "Save changes" : "Create Form Template"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
