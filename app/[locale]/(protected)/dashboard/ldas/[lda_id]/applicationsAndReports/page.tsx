import { getTranslations } from "next-intl/server"
import { FilteredLDAForms } from "@/components/lda-forms/filtered"
import { 
  fetchFormStatuses, 
  fetchFormTemplates, 
  fetchLocalDevelopmentAgency, 
  fetchLocalDevelopmentAgencyFormsForLDA 
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import { FormTemplateWithRelations, LocalDevelopmentAgencyFormFull } from "@/types/models"
import { FormStatus } from "@prisma/client"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'LDAsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
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
  
  // Fetch LDA and forms data
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  const formTemplates: FormTemplateWithRelations[] = await fetchFormTemplates()
  const ldaForms: LocalDevelopmentAgencyFormFull[] = await fetchLocalDevelopmentAgencyFormsForLDA(String(lda.id))
  const formStatuses: FormStatus[] = await fetchFormStatuses()

  const dataChanged = async () => {
    "use server"
    revalidateTag('ldas')
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
