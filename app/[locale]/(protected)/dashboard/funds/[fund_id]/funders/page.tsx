import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredFundFunders } from "@/components/funds/filtered-funders"
import { fetchFund, fetchFunders } from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  return {
    title: `${t('page title')} - Funders - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FundFundersPageProps {
  params: { fund_id: string }
}

export default async function Page({ params }: FundFundersPageProps) {
  const { fund_id } = params

  // Fetch only the data needed for funders tab
  const [fund, allFunders] = await Promise.all([
    fetchFund(fund_id),
    fetchFunders()
  ])
  
  if (!fund) {
    return redirect('/dashboard/funds')
  }

  const fundFunders = fund.fundFunders || []
  const fundLocalDevelopmentAgencies = fund.fundLocalDevelopmentAgencies || []
  
  // Calculate total allocated amount to LDAs
  const allocatedAmount = fundLocalDevelopmentAgencies.reduce((sum, lda) => {
    return sum + (lda.amount ? Number(lda.amount) : 0)
  }, 0)

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds')
  }

  return (
    <div>
      <FilteredFundFunders 
        fundFunders={fundFunders}
        fundId={parseInt(fund_id)}
        fundName={fund.name}
        fundAmount={Number(fund.amount)}
        allocatedAmount={allocatedAmount}
        allFunders={allFunders}
        callback={dataChanged}
      />
    </div>
  )
}
