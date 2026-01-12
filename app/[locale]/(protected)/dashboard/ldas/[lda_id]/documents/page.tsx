import { getTranslations } from "next-intl/server"
import { FilteredDocuments } from "@/components/documents/filtered"
import { fetchLocalDevelopmentAgency, fetchLDADocuments } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: `${LDA_TERMINOLOGY.shortNamePlural} - Documents - ${tM('title')}`,
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
  
  // Fetch LDA and documents in parallel (LDA fetch will be deduplicated with layout)
  const [lda, documents] = await Promise.all([
    fetchLocalDevelopmentAgency(lda_id),
    fetchLDADocuments(lda_id)
  ])
  
  if (!lda) {
    return redirect(LDA_TERMINOLOGY.dashboardPath)
  }

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
