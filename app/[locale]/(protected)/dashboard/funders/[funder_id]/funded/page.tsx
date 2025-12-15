import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredFundLDAs } from "@/components/funds/funded-ldas"
import { 
  fetchFunder,
  fetchFunderLDAs,
  fetchFunds,
  fetchLocalDevelopmentAgencies
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  return {
    title: `${t('page title')} - Funded LDAs - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FunderFundedPageProps {
  params: { funder_id: string }
}

export default async function Page({ params }: FunderFundedPageProps) {
  const { funder_id } = params

  // Fetch only the data needed for funded tab
  const [funder, funderLDAs, allFunds, allLDAs] = await Promise.all([
    fetchFunder(funder_id),
    fetchFunderLDAs(funder_id),
    fetchFunds(),
    fetchLocalDevelopmentAgencies()
  ])
  
  if (!funder) {
    return redirect('/dashboard/funders')
  }

  const dataChanged = async () => {
    "use server"
    revalidateTag('funders')
    revalidateTag(`funder:${funder_id}:ldas`)
  }

  return (
    <div>
      <FilteredFundLDAs 
        fundedLDAs={funderLDAs}
        fundingCalculationType="total_funded_amount"
        showLinkButton={false}
        availableLDAs={allLDAs.map(lda => ({ id: lda.id, name: lda.name }))}
        funds={allFunds.map(fund => ({ id: fund.id, label: fund.name }))}
        callback={dataChanged}
      />
    </div>
  )
}
