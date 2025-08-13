import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from "@/components/ui/card"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'SignUpPendingPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

export default function Page() {
  const t = useTranslations('SignUpPendingPage')
  const tC = useTranslations('common')
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="flex flex-col gap-6 p-6 md:p-8">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">{t('title')}</h1>
                  <p className="text-balance text-muted-foreground">
                    {t('sub-title')}
                  </p>
                </div>
                <hr />
                <div className="text-center text-sm">
                  <a href="/" className="underline underline-offset-4">
                    {tC('Home')}
                  </a>
                </div>
              </div>
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
      </div>
    </div>
  )
}
