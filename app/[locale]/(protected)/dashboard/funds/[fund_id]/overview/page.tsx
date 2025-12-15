import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { Overview } from "@/components/funds/overview"
import { fetchFund } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FundOverviewPageProps {
  params: { fund_id: string }
}

export default async function Page({ params }: FundOverviewPageProps) {
  const { fund_id } = params

  // Fetch only the data needed for overview (fund is already fetched in layout)
  const fund = await fetchFund(fund_id)
  
  if (!fund) {
    return redirect('/dashboard/funds')
  }

  return (
    <div>
      <Overview fund={fund} />
    </div>
  )
}
