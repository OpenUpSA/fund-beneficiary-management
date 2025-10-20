"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
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

import { Contact } from '@prisma/client'

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

interface FormDialogProps {
  contact?: Contact
  ldaId: number
  callback: () => void
}

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contactNumber: z.string(),
  email: z.string().email("This is not a valid email.").or(z.literal("")),
  position: z.string(),
  info: z.string(),
  localDevelopmentAgencyId: z.number(),
})

export function FormDialog({ contact, ldaId, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: contact ? contact.name : "",
      contactNumber: contact ? contact.contactNumber : "",
      email: contact ? contact.email : "",
      position: contact ? contact.position : "",
      info: contact ? contact.info : "",
      localDevelopmentAgencyId: contact ? contact.localDevelopmentAgencyId : ldaId,
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (contact) {
      const toastId = toast.loading('Updating Contact...')
      try {
        const response = await fetch(`/api/lda/${contact.localDevelopmentAgencyId}/contact/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        toast.dismiss(toastId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          toast.error(errorData.message || `Failed to update contact (${response.status})`)
          return
        }
        
        toast.success('Contact updated')
        setOpen(false)
        callback()
        form.reset()
      } catch (error) {
        toast.dismiss(toastId)
        console.error('Update contact error:', error)
        toast.error('Network error while updating contact')
      }
    } else {
      const toastId = toast.loading('Creating contact...')
      try {
        
        const response = await fetch(`/api/lda/${ldaId}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        toast.dismiss(toastId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          toast.error(errorData.message || `Failed to create contact`)
          return
        }
        
        toast.success('Contact created successfully')
        setOpen(false)
        callback()
        form.reset()
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Error while creating contact')
        console.error('Create contact error:', error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {contact ? (
          <span className="flex items-center gap-2 hover:cursor-pointer w-full"><PencilIcon size={10} /> Edit</span>
        ) : (
          <Button>
            <PlusIcon />
            <span className="hidden md:inline">Add contact</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>{contact ? "Edit" : "Add"} Contact</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow contents">
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Info</FormLabel>
                  <FormControl>
                    <Textarea rows={5} className="resize-none" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            </div>
            <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-6 pb-6 pt-4 border-t mt-auto">
              <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">Cancel</Button>
              <Button 
                type="submit" 
                className="sm:order-2 order-1"
              >
                {contact ? "Save changes" : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog >
  )
}
