import { getTranslations } from "next-intl/server"
import { FilteredLDAForms } from "@/components/lda-forms/filtered"
import { 
  fetchFormStatuses, 
  fetchFormTemplates, 
  fetchLocalDevelopmentAgency, 
  fetchLocalDevelopmentAgencyFormsForLDA 
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: `${LDA_TERMINOLOGY.shortNamePlural} - Funding & Reports - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface LDAApplicationsPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAApplicationsPageProps) {
  const { lda_id } = params
  
  // Fetch all data in parallel (LDA fetch will be deduplicated with layout)
  const [lda, formTemplates, ldaForms, formStatuses] = await Promise.all([
    fetchLocalDevelopmentAgency(lda_id),
    fetchFormTemplates(),
    fetchLocalDevelopmentAgencyFormsForLDA(lda_id),
    fetchFormStatuses()
  ])
  
  if (!lda) {
    return redirect(LDA_TERMINOLOGY.dashboardPath)
  }

  const dataChanged = async (ldaId?: number) => {
    "use server"
    if (ldaId) {
      revalidateTag(`lda-forms:lda:${ldaId}:list`)
    } else {
      revalidateTag('lda-forms:list')
    }
  }

  return (
    <div>
      <FilteredLDAForms
        formTemplates={formTemplates}
        formStatuses={formStatuses}
        lda={lda}
        ldaForms={ldaForms}
        dataChanged={dataChanged}
        navigatedFrom="lda"
      />
    </div>
  )
}
