import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
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

interface LDAPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAPageProps) {
  const { lda_id } = params
  // Redirect to the overview tab by default
  redirect(`/dashboard/ldas/${lda_id}/overview`)
}