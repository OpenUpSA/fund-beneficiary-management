"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDownIcon, CopyIcon, InfoIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FormStatus, FormTemplate } from "@prisma/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Control, UseFormReturn } from "react-hook-form"
import { ASSIGNABLE_FORM_ROLES, getRoleDisplayName } from "@/lib/permissions"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LDA_TERMINOLOGY } from "@/constants/lda"

// Roles selectable in the form-permission pickers. SUPER_USER is excluded — it
// always has full access. Labels use the configured terminology (e.g. "LDA User").
const formRoleOptions = ASSIGNABLE_FORM_ROLES.map((role) => ({
  value: role,
  label: getRoleDisplayName(role),
}))

type FormRole = 'USER' | 'PROGRAMME_OFFICER' | 'ADMIN'

// Roles pre-selected when creating a new template. Existing templates show whatever
// is stored (empty at the DB level until set).
const defaultRoleSelection = [...ASSIGNABLE_FORM_ROLES] as FormRole[]
// Creating is staff-only unless an admin opts LDA users in (matches the data migration)
const defaultCreateRoleSelection: FormRole[] = ['PROGRAMME_OFFICER', 'ADMIN']

const formCategoryOptions = [
  { value: 'dft_application', label: 'DFT Application' },
  { value: 'dft_report', label: 'DFT Report' },
  { value: 'fris_application', label: 'FRIS Application' },
  { value: 'fris_claim', label: 'FRIS Claim' },
  { value: 'grant_funding', label: 'Grant Funding' },
  { value: 'narrative_report', label: 'Narrative Report' },
  { value: 'finance_report', label: 'Finance Report' },
]

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  active: z.boolean(),
  description: z.string().min(2, { message: "Description must be at least 2 characters." }),
  templateType: z.enum(['APPLICATION', 'REPORT']),
  formCategory: z.string().nullable().optional(),
  linkedFormTemplateId: z.number().nullable().optional(),
  linkedFormTriggerStatusId: z.number().nullable().optional(),
  linkedFormDueDays: z.number().int().min(0).max(365, { message: "Must be 365 days or fewer." }).nullable().optional(),
  sidebarConfig: z.object({
    amount: z.boolean(),
    status: z.boolean(),
    startDate: z.boolean(),
    endDate: z.boolean(),
    dueDate: z.boolean(),
  }),
  createRoles: z.array(z.enum(['USER', 'PROGRAMME_OFFICER', 'ADMIN'])),
  readRoles: z.array(z.enum(['USER', 'PROGRAMME_OFFICER', 'ADMIN'])).min(1, { message: "Select at least one role." }),
  fillRoles: z.array(z.enum(['USER', 'PROGRAMME_OFFICER', 'ADMIN'])).min(1, { message: "Select at least one role." }),
  approveRoles: z.array(z.enum(['USER', 'PROGRAMME_OFFICER', 'ADMIN'])).min(1, { message: "Select at least one role." }),
})

type FormTemplateFormValues = z.infer<typeof FormSchema>

// Multi-role checkbox picker for a single form-permission key (read/fill/approve).
function FormPermissionRow({
  control,
  name,
  label,
}: {
  control: Control<FormTemplateFormValues>
  name: 'createRoles' | 'readRoles' | 'fillRoles' | 'approveRoles'
  label: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1">
          <FormLabel className="text-sm font-normal text-muted-foreground">{label}</FormLabel>
          <div className="flex flex-wrap gap-4">
            {formRoleOptions.map((role) => {
              const selected = (field.value ?? []) as string[]
              const checked = selected.includes(role.value)
              return (
                <label key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      field.onChange(
                        value
                          ? [...selected, role.value]
                          : selected.filter((v) => v !== role.value)
                      )
                    }}
                  />
                  <span className="text-sm font-normal">{role.label}</span>
                </label>
              )
            })}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// Form-permissions section shared by the create and edit dialogs.
function FormPermissionsSection({ control }: { control: Control<FormTemplateFormValues> }) {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div>
        <Label className="text-sm font-medium">Form Permissions</Label>
        <p className="text-xs text-muted-foreground">
          Choose which roles can create, read, fill in and approve forms built from this template. Super Users always have full access.
        </p>
      </div>
      <FormPermissionRow control={control} name="createRoles" label="Created by" />
      <FormPermissionRow control={control} name="readRoles" label="Read by" />
      <FormPermissionRow control={control} name="fillRoles" label="Filled by" />
      <FormPermissionRow control={control} name="approveRoles" label="Approved by" />
    </div>
  )
}

// "UnderReview" -> "Under review (submitted)", "Approved" -> "Approved"
const statusOptionLabel = (label: string) =>
  label === 'UnderReview'
    ? 'Under review (submitted)'
    : label.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^(\w)(.*)$/, (_, a: string, b: string) => a + b.toLowerCase())

function FieldInfo({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="More information">
          <InfoIcon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  )
}

// When the linked form is created, and how long the LDA has to complete it.
// Shared by the create and edit dialogs; only shown once a linked template is picked.
function LinkedFormSettingsFields({ form }: { form: UseFormReturn<FormTemplateFormValues> }) {
  const [statuses, setStatuses] = useState<FormStatus[]>([])
  const linkedFormTemplateId = form.watch('linkedFormTemplateId')

  useEffect(() => {
    if (!linkedFormTemplateId || statuses.length > 0) return
    fetch('/api/form-status')
      .then((res) => (res.ok ? res.json() : []))
      .then(setStatuses)
      .catch(() => setStatuses([]))
  }, [linkedFormTemplateId, statuses.length])

  if (!linkedFormTemplateId) return null

  return (
    <div className="rounded-md border p-4 space-y-4">
      <FormField
        control={form.control}
        name="linkedFormTriggerStatusId"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1.5">
              <FormLabel>Create linked form when status is</FormLabel>
              <FieldInfo
                text={`The linked form is created for the ${LDA_TERMINOLOGY.shortName} when a form from this template reaches this status, e.g. "Under review" (as soon as it is submitted) or "Approved". The new form opens as a Draft the ${LDA_TERMINOLOGY.shortName} can fill in straight away.`}
              />
            </div>
            <Select
              value={field.value?.toString() ?? 'default'}
              onValueChange={(val) => field.onChange(val === 'default' ? null : parseInt(val, 10))}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="default">Approved (default)</SelectItem>
                {statuses
                  .filter((s) => s.label !== 'Approved')
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {statusOptionLabel(s.label)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="linkedFormDueDays"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1.5">
              <FormLabel>Days to complete linked form</FormLabel>
              <FieldInfo
                text={`Number of days the ${LDA_TERMINOLOGY.shortName} has to complete the linked form, counted from the day it is created. Leave empty for no due date.`}
              />
            </div>
            <FormControl>
              <Input
                type="number"
                min={0}
                max={365}
                step={1}
                placeholder="No due date"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Picking "None" as the linked template also clears its settings
const clearLinkedFormSettings = (form: UseFormReturn<FormTemplateFormValues>) => {
  form.setValue('linkedFormTriggerStatusId', null)
  form.setValue('linkedFormDueDays', null)
}

interface FormDialogProps {
  formTemplate?: FormTemplate
  allTemplates?: FormTemplate[]
}

// Edit Form Template Dialog (used when editing existing template)
export function FormDialog({ formTemplate, allTemplates = [] }: FormDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

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
      formCategory: formTemplate?.formCategory || null,
      linkedFormTemplateId: formTemplate?.linkedFormTemplateId || null,
      linkedFormTriggerStatusId: formTemplate?.linkedFormTriggerStatusId ?? null,
      linkedFormDueDays: formTemplate?.linkedFormDueDays ?? null,
      sidebarConfig: parsedSidebarConfig,
      // Existing templates use stored roles; a brand-new template pre-selects all roles.
      createRoles: (formTemplate?.createRoles as FormRole[] | undefined) ?? defaultCreateRoleSelection,
      readRoles: (formTemplate?.readRoles as FormRole[] | undefined) ?? defaultRoleSelection,
      fillRoles: (formTemplate?.fillRoles as FormRole[] | undefined) ?? defaultRoleSelection,
      approveRoles: (formTemplate?.approveRoles as FormRole[] | undefined) ?? defaultRoleSelection,
    },
  })

  const availableTemplatesForLinking = allTemplates.filter(t => 
    t.id !== formTemplate?.id
  )

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    if (formTemplate) {
      const toastId = toast.loading('Updating form template...')
      const response = await fetch(`/api/form-template/${formTemplate?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.refresh()
        toast.success('Form template updated', { id: toastId })
      } else {
        const error = await response.json().catch(() => null)
        toast.error(error?.error || 'Failed to update form template', { id: toastId })
      }
    } else {
      const toastId = toast.loading('Creating form template...')
      const response = await fetch(`/api/form-template/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.refresh()
        toast.success('Form template created', { id: toastId })
      } else {
        const error = await response.json().catch(() => null)
        toast.error(error?.error || 'Failed to create form template', { id: toastId })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {formTemplate && (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <span className="hidden md:inline">Edit details</span>
          <PencilIcon />
        </Button>
      )}
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
                name="formCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Category</FormLabel>
                    <Select 
                      value={field.value || 'none'} 
                      onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {formCategoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
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
                    <FormControl>
                      <Combobox
                        options={[
                          { value: 'none', label: 'None' },
                          ...availableTemplatesForLinking.map((t) => ({
                            value: t.id.toString(),
                            label: t.name,
                          })),
                        ]}
                        value={field.value?.toString() || 'none'}
                        onChange={(val) => {
                          if (val === 'none') clearLinkedFormSettings(form)
                          field.onChange(val === 'none' ? null : parseInt(val))
                        }}
                        placeholder="Select form template"
                        searchPlaceholder="Search templates..."
                        emptyText="No templates found."
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <LinkedFormSettingsFields form={form} />

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
                )}
              />

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

              <FormPermissionsSection control={form.control} />
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

// Clone Form Template Dialog
interface CloneDialogProps {
  allTemplates: FormTemplate[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CloneDialog({ allTemplates, open, onOpenChange }: CloneDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [cloneName, setCloneName] = useState("")
  const router = useRouter()

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = allTemplates.find(t => t.id.toString() === templateId)
    if (template) {
      setCloneName(`${template.name} - Copy`)
    }
  }

  const handleClone = async () => {
    if (!selectedTemplate || !cloneName.trim()) {
      toast.error("Please select a template and enter a name")
      return
    }

    onOpenChange(false)
    const toastId = toast.loading('Cloning form template...')

    const res = await fetch(`/api/form-template/${selectedTemplate}/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cloneName.trim() }),
    })

    if (res.ok) {
      router.refresh()
      toast.success('Form template cloned', { id: toastId })
      setSelectedTemplate("")
      setCloneName("")
    } else {
      const error = await res.json()
      toast.error(error.error || 'Failed to clone template', { id: toastId })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Clone Form Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Template to Clone</Label>
            <Combobox
              options={allTemplates.map((t) => ({
                value: t.id.toString(),
                label: `${t.name} (${t.templateType})`,
              }))}
              value={selectedTemplate}
              onChange={handleTemplateSelect}
              placeholder="Select a template"
              searchPlaceholder="Search templates..."
              emptyText="No templates found."
            />
          </div>

          {selectedTemplate && (
            <div className="space-y-2">
              <Label>New Template Name</Label>
              <Input 
                value={cloneName} 
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for cloned template"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleClone} disabled={!selectedTemplate || !cloneName.trim()}>
            <CopyIcon className="h-4 w-4 mr-2" />
            Clone Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Create Template Dropdown Button with options for New and Clone
interface CreateTemplateButtonProps {
  allTemplates: FormTemplate[]
}

export function CreateTemplateButton({ allTemplates }: CreateTemplateButtonProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <span className="hidden md:inline">Create template</span>
            <ChevronDownIcon className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create new template
          </DropdownMenuItem>
          {allTemplates.length > 0 && (
            <DropdownMenuItem onClick={() => setCloneDialogOpen(true)}>
              <CopyIcon className="h-4 w-4 mr-2" />
              Clone existing template
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create New Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
          <CreateNewTemplateForm onClose={() => setCreateDialogOpen(false)} allTemplates={allTemplates} />
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <CloneDialog 
        allTemplates={allTemplates} 
        open={cloneDialogOpen} 
        onOpenChange={setCloneDialogOpen} 
      />
    </>
  )
}

// Create New Template Form (extracted for use in dialog)
interface CreateNewTemplateFormProps {
  onClose: () => void
  allTemplates: FormTemplate[]
}

function CreateNewTemplateForm({ onClose, allTemplates }: CreateNewTemplateFormProps) {
  const defaultSidebarConfig = { amount: true, status: true, startDate: true, endDate: true, dueDate: true }
  const router = useRouter()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      active: true,
      description: "",
      templateType: 'APPLICATION',
      formCategory: null,
      linkedFormTemplateId: null,
      linkedFormTriggerStatusId: null,
      linkedFormDueDays: null,
      sidebarConfig: defaultSidebarConfig,
      createRoles: defaultCreateRoleSelection,
      readRoles: defaultRoleSelection,
      fillRoles: defaultRoleSelection,
      approveRoles: defaultRoleSelection,
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    onClose()
    const toastId = toast.loading('Creating form template...')
    const response = await fetch(`/api/form-template/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      router.refresh()
      toast.success('Form template created', { id: toastId })
    } else {
      const error = await response.json().catch(() => null)
      toast.error(error?.error || 'Failed to create form template', { id: toastId })
    }
  }

  return (
    <>
      <DialogHeader className="p-5 border-b">
        <DialogTitle>Create form template</DialogTitle>
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
              name="formCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Category</FormLabel>
                  <Select 
                    value={field.value || 'none'} 
                    onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {formCategoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                  <FormControl>
                    <Combobox
                      options={[
                        { value: 'none', label: 'None' },
                        ...allTemplates.map((t) => ({
                          value: t.id.toString(),
                          label: t.name,
                        })),
                      ]}
                      value={field.value?.toString() || 'none'}
                      onChange={(val) => {
                        if (val === 'none') clearLinkedFormSettings(form)
                        field.onChange(val === 'none' ? null : parseInt(val))
                      }}
                      placeholder="Select form template"
                      searchPlaceholder="Search templates..."
                      emptyText="No templates found."
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <LinkedFormSettingsFields form={form} />

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
              )}
            />

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

            <FormPermissionsSection control={form.control} />
          </div>
          <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
            <Button type="button" onClick={onClose} variant="secondary" className="sm:order-1 order-2">Cancel</Button>
            <Button type="submit" className="sm:order-2 order-1">Create Form Template</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}
