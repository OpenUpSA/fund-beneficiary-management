import { NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from "@/components/theme-provider"

import "../globals.css"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: tM('title'),
    description: tM('description')
  }
}

export default async function Layout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {
  const messages = await getMessages()
  return (
    <>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
        >
          {children}
        </ThemeProvider>
      </NextIntlClientProvider>
    </>
  )
}
