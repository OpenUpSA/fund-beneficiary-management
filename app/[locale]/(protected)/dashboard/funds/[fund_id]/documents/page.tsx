import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredDocuments } from "@/components/documents/filtered"
import { fetchFund, fetchFundDocuments } from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  return {
    title: `${t('page title')} - Documents - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FundDocumentsPageProps {
  params: { fund_id: string }
}

export default async function Page({ params }: FundDocumentsPageProps) {
  const { fund_id } = params

  // Fetch only the data needed for documents tab
  const [fund, fundDocuments] = await Promise.all([
    fetchFund(fund_id),
    fetchFundDocuments(fund_id)
  ])
  
  if (!fund) {
    return redirect('/dashboard/funds')
  }

  const dataChanged = async () => {
    "use server"
    revalidateTag(`documents:fund:${fund_id}`)
  }

  return (
    <div>
      <FilteredDocuments
        dataChanged={dataChanged}
        documents={fundDocuments}
      />
    </div>
  )
}
