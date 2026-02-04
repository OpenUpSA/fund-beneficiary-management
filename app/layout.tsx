import { SessionWrapper } from '@/components/session-wrapper'
import { Toaster } from '@/components/ui/toaster'
import localFont from 'next/font/local'
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

const geistSans = localFont({
  src: '/fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: '/fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export function generateMetadata(): Metadata {
  return {
    icons: {
      icon: process.env.NEXT_PUBLIC_FAVICON_PATH || '/images/favicon/favicon.ico',
    },
    other: {
      ...Sentry.getTraceData()
    }
  }
}

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {
  return (
    <SessionWrapper>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground bg-background h-auto`}
        >
          {children}
          <Toaster />
        </body>
      </ html>
    </SessionWrapper>
  )
}
