"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { LocalDevelopmentAgency, Document } from "@prisma/client"
import { useTranslations } from "next-intl"
import { DocumentTypeEnum } from "@/types/formSchemas"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar"

const getFormSchema = (document?: Document) => {
  return z.object({
    title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    description: z.string().min(2, { message: "Description must be at least 2 characters." }),
    localDevelopmentAgencyId: z.coerce.number({ required_error: "Please select a local development agency." }),
    documentType: DocumentTypeEnum,
    validFromDate: z.date({ required_error: "Please select a valid from." }).refine(date => date !== undefined, {
      message: "Valid from is required."
    }),
    validUntilDate: z.date({ required_error: "Please select a valid until." }).refine(date => date !== undefined, {
      message: "Valid until is required."
    }),
    file: z
      .any()
      .optional()
      .refine(
        (file) => {
          if (!file || file instanceof File) return true
          return false
        },
        { message: "Invalid file" }
      )
      .refine(
        (file) => {
          if (!file || !(file instanceof File)) return true
          return [
            "application/msword", // .doc
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
            "application/pdf", // .pdf
            "application/vnd.ms-excel", // .xls
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          ].includes(file.type)
        },
        { message: "Invalid file type" }
      )
      .refine(
        (file) => {
          if (!document && !(file instanceof File)) return false
          return true
        },
        { message: "File is required" }
      ),
  })
}

interface FormDialogProps {
  document?: Document,
  lda?: LocalDevelopmentAgency,
  ldas?: LocalDevelopmentAgency[],
  callback: () => void
}

export function FormDialog({ document, lda, ldas, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const tC = useTranslations('common')

  const FormSchema = getFormSchema(document)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: document ? document.title : "",
      description: document ? document?.description : "",
      localDevelopmentAgencyId: document?.localDevelopmentAgencyId ?? lda?.id ?? 0,
      documentType: document ? document.documentType : undefined,
      validFromDate: document ? new Date(document.validFromDate) : new Date(),
      validUntilDate: document ? new Date(document.validUntilDate) : new Date()
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)
    const formData = new FormData()
    formData.append("title", data.title)
    formData.append("description", data.description)
    formData.append("validFromDate", data.validFromDate.toISOString())
    formData.append("validUntilDate", data.validUntilDate.toISOString())
    formData.append("localDevelopmentAgencyId", data.localDevelopmentAgencyId.toString())

    if (data.file instanceof File) {
      formData.append("file", data.file)
    }

    const method = document ? "PUT" : "POST"
    const endpoint = document ? `/api/document/${document.id}` : `/api/document`

    toast({ title: document ? "Updating document..." : "Creating document...", variant: "processing" })

    await fetch(endpoint, {
      method,
      body: formData,
    })

    toast({ title: document ? "Document updated" : "Document created", variant: "success" })
    callback()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {document ? (
          <span className="flex items-center gap-2 hover:cursor-pointer w-full"><PencilIcon size={10} /> Edit</span>
        ) : (
          <Button>
            <PlusIcon />
            <span className="hidden md:inline">Add document</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>{document ? "Edit" : "Add"} document</DialogTitle>
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={5} className="resize-none" {...field} />
                  </FormControl>

                </FormItem>
              )}
            />

            {ldas && (
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
                )} />)}

            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{document?.filePath ? 'New File' : 'File'}</FormLabel>
                  <FormControl>
                    <Input
                      id="file"
                      type="file"
                      accept=".doc,.docx,.pdf,.xls,.xlsx"
                      onChange={(e) => {
                        field.onChange(e.target.files?.[0])
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="validFromDate"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Valid From</FormLabel>
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
                name="validUntilDate"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Valid Until</FormLabel>
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
              name="documentType"
              render={({ field }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel>Document Type</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DocumentTypeEnum.options.map((documentType) => (
                        <SelectItem
                          key={documentType}
                          value={documentType}
                        >
                          {tC(`documentTypes.${documentType}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{document ? "Save changes" : "Create document"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
