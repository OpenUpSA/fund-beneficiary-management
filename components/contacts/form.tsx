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
  connectOnCreate?: unknown
  callback: () => void
}

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contactNumber: z.string(),
  email: z.string().email("This is not a valid email.").or(z.literal("")),
  position: z.string(),
  info: z.string()
})

export function FormDialog({ contact, connectOnCreate, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: contact ? contact.name : "",
      contactNumber: contact ? contact.contactNumber : "",
      email: contact ? contact.email : "",
      position: contact ? contact.position : "",
      info: contact ? contact.info : ""
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    if (contact) {
      const toastId = toast.loading('Updating Contact...')
      await fetch(`/api/contact/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast.dismiss(toastId)
      toast.success('Contact updated')
    } else {
      const toastId = toast.loading('Creating contact...')
      const combinedData = {
        ...data,
        ...(connectOnCreate || {}),
      }
      await fetch(`/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(combinedData),
      })
      toast.dismiss(toastId)
      toast.success('Contact created')
    }

    callback()
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {contact ?
          <span className="flex items-center gap-2"><PencilIcon className="hover:cursor-pointer" size={10} /> Edit</span>
          :
          <Button><PlusIcon/><span className="hidden md:inline">Add contact</span></Button>
        }
      </DialogTrigger>
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit" : "Add"} Contact</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          </form>

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
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{contact ? "Save changes" : "Create Contact"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
