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
import { User } from '@prisma/client'

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
import { UserFormSchema, RoleEnum } from "@/types/formSchemas"
import { Checkbox } from "../ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useTranslations } from "next-intl"

interface FormDialogProps {
  user?: User
  callback: () => void
}

export function FormDialog({ user, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)
  const formSchema = UserFormSchema(user ? false : true)
  const tC = useTranslations('common')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user ? user.name : '',
      email: user ? user.email : '',
      approved: user ? user.approved : false,
      role: user ? user.role : undefined,
      password: '',
      passwordConfirm: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setOpen(false)

    if (user) {
      toast({
        title: 'Updating user...',
        variant: 'processing'
      })
      const userData = {
        name: data.name,
        email: data.email,
        approved: data.approved,
        role: data.role
      }
      await fetch(`/api/user/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      })
      toast({
        title: 'User updated',
        variant: 'success'
      })
    } else {
      toast({
        title: 'Creating user...',
        variant: 'processing'
      })
      const userData = {
        name: data.name,
        email: data.email,
        approved: data.approved,
        role: data.role,
        password: data.password
      }
      await fetch(`/api/user/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      })
      toast({
        title: 'User created',
        variant: 'success'
      })
    }

    callback()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {user ? <>
            <span className="hidden md:inline">Edit details</span>
            <PencilIcon />
          </>
            : <>
              <span className="hidden md:inline">Add user</span>
              <PlusIcon />
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>{user ? "Edit" : "Add"} user</DialogTitle>
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
              name="role"
              render={({ field }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RoleEnum.options.map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                        >
                          {tC(`roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

            <FormField
              control={form.control}
              name="approved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Approved
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {!user && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input autoComplete="new-password" type="password" {...field} />
                    </FormControl>

                  </FormItem>
                )}
              />
            )}

            {!user && (
              <FormField
                control={form.control}
                name="passwordConfirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input autoComplete="new-password" type="password" {...field} />
                    </FormControl>

                  </FormItem>
                )}
              />
            )}

          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{user ? "Save changes" : "Create User"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
