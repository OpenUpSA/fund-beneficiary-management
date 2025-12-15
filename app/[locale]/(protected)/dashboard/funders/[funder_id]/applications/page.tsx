import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredLDAForms } from "@/components/lda-forms/filtered"
import { 
  fetchFunder,
  fetchFunderLDAForms,
  fetchFormTemplates,
  fetchFormStatuses
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  return {
    title: `${t('page title')} - Applications - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FunderApplicationsPageProps {
  params: { funder_id: string }
}

export default async function Page({ params }: FunderApplicationsPageProps) {
  const { funder_id } = params

  // Fetch only the data needed for applications tab
  const [funder, ldaForms, formTemplates, formStatuses] = await Promise.all([
    fetchFunder(funder_id),
    fetchFunderLDAForms(funder_id),
    fetchFormTemplates(),
    fetchFormStatuses()
  ])
  
  if (!funder) {
    return redirect('/dashboard/funders')
  }

  const dataChanged = async () => {
    "use server"
    revalidateTag(`funder-lda-forms:${funder_id}`)
    revalidateTag('lda-forms:list')
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
