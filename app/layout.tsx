import { SessionWrapper } from "@/components/session-wrapper"
import { Toaster } from "@/components/ui/toaster"
import localFont from "next/font/local"

const geistSans = localFont({
  src: "/fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})

const geistMono = localFont({
  src: "/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})

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
          className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground bg-muted h-auto`}
        >
          {children}
          <Toaster />
        </body>
      </ html>
    </SessionWrapper>
  )
}
