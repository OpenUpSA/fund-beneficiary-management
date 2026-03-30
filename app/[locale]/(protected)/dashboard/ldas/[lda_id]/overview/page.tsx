import { getTranslations } from "next-intl/server"
import { Overview } from "@/components/ldas/overview"
import { fetchLocalDevelopmentAgency, fetchFunds } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: `${LDA_TERMINOLOGY.shortNamePlural} - ${tM('title')}`,
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
  
  // Fetch LDA from layout cache (Next.js will deduplicate with layout's fetch)
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  if (!lda) {
    return redirect(LDA_TERMINOLOGY.dashboardPath)
  }

  // Fetch funds separately - this is tab-specific data
  const funds = fetchFunds(lda_id)

  return (
    <div>
      <Overview lda={lda} funds={funds}/>
    </div>
  )
}
