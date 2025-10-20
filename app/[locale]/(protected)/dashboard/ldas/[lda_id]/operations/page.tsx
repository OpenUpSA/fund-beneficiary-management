import { getTranslations } from "next-intl/server"
import { fetchLocalDevelopmentAgency } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { redirect } from "next/navigation"
import { OperationsView } from "@/components/ldas/operations"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'LDAsPage' })

  return {
    title: `${t('page title')} - Operations - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface OperationsPageProps {
  params: { lda_id: string }
}

export default async function OperationsPage({ params }: OperationsPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  if (!lda) {
    return redirect('/dashboard/ldas')
  }

  return (
    <div className="space-y-4">
      <OperationsView lda={lda} />
    </div>
  )
}
