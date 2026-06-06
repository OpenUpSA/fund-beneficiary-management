"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from 'next-intl'
import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export function ChangePasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations('AccountChangePasswordPage')
  const tC = useTranslations('common')
  const { data: session } = useSession()
  const router = useRouter()

  const [accountNewPassword, setAccountNewPassword] = useState<string>('')
  const [accountNewPasswordConfirm, setAccountNewPasswordConfirm] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    if (accountNewPassword !== accountNewPasswordConfirm) {
      toast({ title: "Passwords do not match", variant: "destructive" })
      return
    }
    if (accountNewPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/user/${session.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: accountNewPassword,
          passwordConfirm: accountNewPasswordConfirm,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast({ title: data.error || "Failed to change password", variant: "destructive" })
        return
      }

      toast({ title: "Password changed", variant: "success" })
      router.push("/account")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={onSubmit} className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_password">{t('New Password')}</Label>
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
                <Label htmlFor="new_password_confirm">{t('New Password Confirm')}</Label>
                <Input
                  id="new_password_confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={accountNewPasswordConfirm}
                  onChange={(e) => setAccountNewPasswordConfirm(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
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
