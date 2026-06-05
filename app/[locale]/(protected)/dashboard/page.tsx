import { getTranslations } from "next-intl/server"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { redirect } from "next/navigation"
import { permissions } from "@/lib/permissions"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'DashboardPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

export default async function Page() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  
  // Redirect non-authorized users to LDAs page
  if (!session?.user || 
      (!permissions.isAdmin(session.user) && 
       !permissions.isProgrammeOfficer(session.user) && 
       !permissions.isSuperUser(session.user))) {
    redirect("/ldas")
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <DashboardContent />
    </div>
  )
}