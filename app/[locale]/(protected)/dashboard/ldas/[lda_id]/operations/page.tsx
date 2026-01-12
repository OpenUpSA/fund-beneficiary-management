import { getTranslations } from "next-intl/server"
import { OperationsView } from "@/components/ldas/operations"
import { fetchLocalDevelopmentAgency } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: `${LDA_TERMINOLOGY.shortNamePlural} - Operations - ${tM('title')}`,
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
  
  // Fetch LDA data (Next.js will automatically deduplicate this with layout's fetch)
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  if (!lda) {
    return redirect(LDA_TERMINOLOGY.dashboardPath)
  }

  return (
    <div>
      <OperationsView lda={lda} />
    </div>
  )
}
