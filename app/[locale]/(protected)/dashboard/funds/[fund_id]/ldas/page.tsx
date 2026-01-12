import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredFundLDAs } from "@/components/funds/funded-ldas"
import { fetchFund, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { LDA_TERMINOLOGY } from "@/constants/lda"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  return {
    title: `${t('page title')} - ${LDA_TERMINOLOGY.fundedLabel} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FundLDAsPageProps {
  params: { fund_id: string }
}

export default async function Page({ params }: FundLDAsPageProps) {
  const { fund_id } = params

  // Fetch only the data needed for LDAs tab
  const [fund, allLDAs] = await Promise.all([
    fetchFund(fund_id),
    fetchLocalDevelopmentAgencies()
  ])
  
  if (!fund) {
    return redirect('/dashboard/funds')
  }

  const fundLocalDevelopmentAgencies = fund.fundLocalDevelopmentAgencies || []

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds')
  }

  return (
    <div>
      <FilteredFundLDAs 
        fundedLDAs={fundLocalDevelopmentAgencies} 
        fundId={parseInt(fund_id)}
        fundName={fund.name}
        fundAmount={Number(fund.amount)}
        fundDefaultAmount={fund.defaultAmount ? Number(fund.defaultAmount) : null}
        fundingCalculationType="total_funded_amount"
        funds={[]}
        availableLDAs={allLDAs.map(lda => ({ id: lda.id, name: lda.name }))}
        callback={dataChanged}
      />
    </div>
  )
}
