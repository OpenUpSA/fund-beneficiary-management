import { getTranslations } from "next-intl/server"
import { FilteredDocuments } from "@/components/documents/filtered"
import { fetchLocalDevelopmentAgency, fetchLDADocuments } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
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
  if (!lda) {
    return redirect('/dashboard/ldas')
  }
  
  const documents = await fetchLDADocuments(lda_id)

  const dataChanged = async () => {
    "use server"
    revalidateTag(`documents:lda:${lda_id}`)
  }

  return (
    <div>
      <FilteredDocuments
        documents={documents}
        lda={lda}
        dataChanged={dataChanged}
        navigatedFrom="lda"
      />
    </div>
  )
}
