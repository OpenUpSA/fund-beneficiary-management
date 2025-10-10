"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from 'next-intl'
import { useRouter } from "next/navigation";
import { useState } from "react"
import { signIn } from "next-auth/react";
import { toast } from "@/hooks/use-toast"

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations('SignInPage')
  const tC = useTranslations('common')
  const router = useRouter()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [invalidCredentials, setInvalidCredentials] = useState<boolean>(false)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={
              async (e) => {
                e.preventDefault();
                toast({
                  title: "Signing you in...",
                  variant: "processing"
                })
                setInvalidCredentials(false)
                
                const res = await signIn("credentials", {
                  email,
                  password,
                  redirect: false,
                })

                if (res?.status === 200) {
                  toast({
                    title: "You are signed in",
                    variant: "success"
                  })
                  router.push("/dashboard/ldas")
                } else {
                  toast({
                    title: "Problem signing in",
                    variant: "destructive"
                  })
                  setInvalidCredentials(true)
                }

                return false
              }
            }
          >
            <div className={`flex flex-col gap-6${invalidCredentials ? ' has-invalid-credentials' : ''}`}>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-balance text-muted-foreground">
                  {t('sub-title')}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{tC('Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{tC('Password')}</Label>
                </div>
                <Input
                  id="password"
                  type="password" required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                {tC('Sign In')}
              </Button>

              <div className="text-center text-sm">
                <a
                  href="/forgot-password"
                  className="underline underline-offset-4"
                >
                  {t('forgot password')}
                </a>
              </div>

              <hr />

              <div className="text-center text-sm">
                {t('account sign up')}{" "}
                <a href="/sign-up" className="underline underline-offset-4">
                  {tC('Sign up')}
                </a>
              </div>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/images/sign-in-background.webp"
              alt={t("image alt")}
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[.75] filter brightness-75"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
