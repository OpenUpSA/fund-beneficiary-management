import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { Overview } from "@/components/funders/overview"
import { fetchFunder, fetchFunderLDAs } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FunderOverviewPageProps {
  params: { funder_id: string }
}

export default async function Page({ params }: FunderOverviewPageProps) {
  const { funder_id } = params

  // Fetch only the data needed for overview
  const [funder, funderLDAs] = await Promise.all([
    fetchFunder(funder_id),
    fetchFunderLDAs(funder_id)
  ])
  
  if (!funder) {
    return redirect('/dashboard/funders')
  }

  return (
    <div>
      <Overview funder={funder} ldaCount={funderLDAs.length} />
    </div>
  )
}
