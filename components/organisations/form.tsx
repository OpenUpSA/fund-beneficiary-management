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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PencilIcon } from "lucide-react"
import { useState } from "react"
import { OrganisationDetail } from "@prisma/client"

interface FormDialogProps {
  organisationDetail: OrganisationDetail
  callback: () => void
}

const FormSchema = z.object({
  contactNumber: z.string(),
  email: z.string().email("This is not a valid email.").or(z.literal("")),
  website: z.string().url("This is not a valid website.").or(z.literal("")),
  addressStreet: z.string(),
  addressComplex: z.string(),
  addressCity: z.string(),
  addressProvince: z.string(),
  coordinates: z.string(),
})

export function FormDialog({ organisationDetail, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      contactNumber: organisationDetail ? organisationDetail.contactNumber : '',
      email: organisationDetail ? organisationDetail.email : '',
      website: organisationDetail ? organisationDetail.website : '',
      addressStreet: organisationDetail ? organisationDetail.physicalStreet : '',
      addressComplex: organisationDetail ? organisationDetail.physicalComplexName : '',
      addressCity: organisationDetail ? organisationDetail.physicalCity : '',
      addressProvince: organisationDetail ? organisationDetail.physicalProvince : '',
      coordinates: organisationDetail ? organisationDetail.latitude + ", " + organisationDetail.longitude : '',
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    toast({
      title: 'Updating details...',
      variant: 'processing'
    })

    await fetch(`/api/organisation-detail/${organisationDetail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    toast({
      title: 'Details updated',
      variant: 'success'
    })

    callback()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem className="w-full flex-1">
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
                  <FormItem className="w-full flex-1">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem className="w-full flex-1">
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressStreet"
                render={({ field }) => (
                  <FormItem className="w-full flex-1">
                    <FormLabel>Street address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="addressComplex"
                render={({ field }) => (
                  <FormItem className="w-full flex-1">
                    <FormLabel>Complex number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressCity"
                render={({ field }) => (
                  <FormItem className="w-full flex-1">
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="addressProvince"
                render={({ field }) => (
                  <FormItem className="w-full flex-1">
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coordinates"
                render={({ field }) => (
                  <FormItem className="w-full flex-1">
                    <FormLabel>GPS coordinates</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{"Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
