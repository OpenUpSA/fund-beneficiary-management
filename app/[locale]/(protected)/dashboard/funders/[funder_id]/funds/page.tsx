import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { ContributedFunds } from "@/components/funders/contributed-funds"
import { fetchFunder, fetchFunds, fetchFocusAreas } from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  return {
    title: `${t('page title')} - Funds - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FunderFundsPageProps {
  params: { funder_id: string }
}

export default async function Page({ params }: FunderFundsPageProps) {
  const { funder_id } = params

  // Fetch only the data needed for funds tab
  const [funder, allFunds, focusAreas] = await Promise.all([
    fetchFunder(funder_id),
    fetchFunds(),
    fetchFocusAreas()
  ])
  
  if (!funder) {
    return redirect('/dashboard/funders')
  }

  const dataChanged = async () => {
    "use server"
    revalidateTag('funders')
  }

  return (
    <div>
      <ContributedFunds
        fundFunders={funder.fundFunders}
        funderId={Number(funder_id)}
        funderName={funder.name}
        availableFunds={allFunds}
        focusAreas={focusAreas}
        callback={dataChanged}
      />
    </div>
  )
}
