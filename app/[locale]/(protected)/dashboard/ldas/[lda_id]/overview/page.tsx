import { getTranslations } from "next-intl/server"
import { Overview } from "@/components/ldas/overview"
import { fetchLocalDevelopmentAgency, fetchFunds } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'LDAsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface LDAOverviewPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAOverviewPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  const funds =  fetchFunds(lda_id)

  return (
    <div>
      <Overview lda={lda} funds={funds}/>
    </div>
  )
}
