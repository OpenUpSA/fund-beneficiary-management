import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from 'next-intl'

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations('ForgotPasswordPage')
  const tC = useTranslations('common')
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="relative hidden bg-muted md:block">
            <img
              src="/images/sign-in-background.webp"
              alt={t("image alt")}
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[.75] filter brightness-75"
            />
          </div>
          <form action="/forgot-password/reset-sent" className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
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
                />
              </div>
              <Button type="submit" className="w-full">
                {tC('Send')}
              </Button>

              <hr />

              <div className="text-center text-sm">
                {t('back to sign in')}{" "}
                <a href="/sign-in" className="underline underline-offset-4">
                  {tC('Sign in')}
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
