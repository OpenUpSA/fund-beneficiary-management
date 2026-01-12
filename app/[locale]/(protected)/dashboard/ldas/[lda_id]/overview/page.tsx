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
  
  // Fetch LDA (Next.js will automatically deduplicate this with layout's fetch)
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  if (!lda) {
    return redirect(LDA_TERMINOLOGY.dashboardPath)
  }

  // Overview component expects funds as a Promise (it uses React.use())
  const funds = fetchFunds(lda_id)

  return (
    <div>
      <Overview lda={lda} funds={funds}/>
    </div>
  )
}
