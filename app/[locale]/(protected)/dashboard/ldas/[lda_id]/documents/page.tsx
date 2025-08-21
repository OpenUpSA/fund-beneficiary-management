import { getTranslations } from "next-intl/server"
import { FilteredDocuments } from "@/components/documents/filtered"
import { fetchLocalDevelopmentAgency } from "@/lib/data"
import { revalidateTag } from "next/cache"
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

interface LDADocumentsPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDADocumentsPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)

  const dataChanged = async () => {
    "use server"
    revalidateTag(`lda-${lda_id}`)
  }

  return (
    <div>
      <FilteredDocuments
        documents={lda.documents}
        lda={lda}
        dataChanged={dataChanged}
        navigatedFrom="lda"
      />
    </div>
  )
}
