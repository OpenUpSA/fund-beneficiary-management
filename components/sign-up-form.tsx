"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTranslations } from 'next-intl'
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { UserFormSchema } from "@/types/formSchemas"

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations('SignUpPage')
  const tC = useTranslations('common')
  const router = useRouter()

  const formSchema = UserFormSchema(true)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirm: '',
      approved: false,
      role: 'USER'
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    toast({
      title: 'Signing you up...',
      variant: 'processing'
    })
    const response = await fetch(`/api/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (response.ok) {
      toast({
        title: 'You are signed up',
        variant: 'success'
      })
      router.push("/sign-up/pending")
    } else {
      toast({
        title: 'Problem signing you up',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">{t('title')}</h1>
                  <p className="text-balance text-muted-foreground">
                    {t('sub-title')}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" {...field} />
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
                        <Input autoComplete="email" {...field} />
                      </FormControl>

                    </FormItem>
                  )}
                />

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

                <Button type="submit" className="w-full" onClick={form.handleSubmit(onSubmit)}>
                  {tC('Sign Up')}
                </Button>

                <hr />

                <div className="text-center text-sm">
                  {t('already have account')}{" "}
                  <a href="/sign-in" className="underline underline-offset-4">
                    {tC('Sign in')}
                  </a>
                </div>
              </div>
            </form>
          </Form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/images/sign-up-background.webp"
              alt={t("image alt")}
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[.75] filter brightness-75"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
