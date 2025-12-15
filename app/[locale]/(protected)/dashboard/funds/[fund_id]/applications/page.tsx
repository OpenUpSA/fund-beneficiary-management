import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredLDAForms } from "@/components/lda-forms/filtered"
import { 
  fetchFund,
  fetchFundLDAForms,
  fetchFormTemplates,
  fetchFormStatuses
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  return {
    title: `${t('page title')} - Applications - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FundApplicationsPageProps {
  params: { fund_id: string }
}

export default async function Page({ params }: FundApplicationsPageProps) {
  const { fund_id } = params

  // Fetch only the data needed for applications tab
  const [fund, ldaForms, formTemplates, formStatuses] = await Promise.all([
    fetchFund(fund_id),
    fetchFundLDAForms(fund_id),
    fetchFormTemplates(),
    fetchFormStatuses()
  ])
  
  if (!fund) {
    return redirect('/dashboard/funds')
  }

  const dataChanged = async () => {
    "use server"
    revalidateTag('lda-forms:list')
    revalidateTag(`fund-lda-forms:${fund_id}`)
  }

  return (
    <div>
      <FilteredLDAForms 
        ldaForms={ldaForms}
        formTemplates={formTemplates}
        formStatuses={formStatuses}
        dataChanged={dataChanged}
      />
    </div>
  )
}
