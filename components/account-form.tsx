"use client"

import { ChangeEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from 'next-intl'
import { useRef, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { Skeleton } from "./ui/skeleton"

interface Props {
  callback: (tag: string) => void
}

export function AccountForm({ callback }: Props) {
  const t = useTranslations('AccountPage')
  const tC = useTranslations('common')

  const { data: session, update } = useSession()

  const avatarFile = useRef<HTMLInputElement>(null)
  const [accountAvatar, setAccountAvatar] = useState<string>('/images/users/1.png')
  const [accountName, setAccountName] = useState<string>('')
  const [accountEmail, setAccountEmail] = useState<string>('')

  useEffect(() => {
    if (session?.user?.id) {
      const fetchUser = async () => {
        const res = await fetch(`/api/user/${session?.user.id}`);
        const data = await res.json();
        setAccountName(data.name);
        setAccountEmail(data.email);
      };
      fetchUser();
    }
  }, [session]);

  if (!session?.user) return <Skeleton className="h-4 w-24" />

  const updateUser = async (e: { preventDefault: () => void }) => {
    e.preventDefault()

    toast({
      title: "Updating your account...",
      variant: "processing"
    })

    const data = { name: accountName, email: accountEmail }

    const response = await fetch(`/api/user/${session?.user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        data
      ),
    })

    callback('users')

    // Update session
    await update({ trigger: "update", updatedUser: await response.json() })

    toast({
      title: "Account updated",
      variant: "success"
    })
  }

  const onAvatarChangeClick = () => {
    avatarFile.current?.click()
  }

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (files && files.length) {
      const imageData = window.URL.createObjectURL(files[0])
      setAccountAvatar(imageData)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={updateUser} className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
              </div>
              <input type="file"
                id="avatarFile"
                ref={avatarFile}
                className="hidden"
                accept="image/*"
                onChange={onAvatarChange} />
              <div className="hover:brightness-[1.2] cursor-pointer" onClick={onAvatarChangeClick}>
                <div className="flex justify-center">
                  <img className="h-16 w-16 rounded-full object-fill black border" src={accountAvatar} alt={t("change avatar alt")} />
                </div>
                <div className="text-sm underline text-center">
                  {t("Change Avatar")}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">{tC('Name')}</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{tC('Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                {tC('Save Changes')}
              </Button>

              <hr />

              <div className="text-center text-sm">
                <a href="/account/change-password" className="underline underline-offset-4">
                  {t('Change Password')}
                </a>
              </div>

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
