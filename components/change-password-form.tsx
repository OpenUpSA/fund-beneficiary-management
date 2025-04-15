"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from 'next-intl'
import { useState } from "react"

export function ChangePasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations('AccountChangePasswordPage')
  const tC = useTranslations('common')

  const [accountNewPassword, setAccountNewPassword] = useState<string>()
  const [accountNewPasswordConfirm, setAccountNewPasswordConfirm] = useState<string>()

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action="/account" className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">{t('New Password')}</Label>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={accountNewPassword}
                  onChange={(e) => setAccountNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">{t('New Password Confirm')}</Label>
                <Input
                  id="new_password_confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={accountNewPasswordConfirm}
                  onChange={(e) => setAccountNewPasswordConfirm(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                {t('Save New Password')}
              </Button>

              <hr />

              <div className="text-center text-sm">
                <a href="/dashboard" className="underline underline-offset-4">
                  {tC('Home')}
                </a>
              </div>
            </div>
          </form>
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
