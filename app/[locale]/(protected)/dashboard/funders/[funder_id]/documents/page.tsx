import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredDocuments } from "@/components/documents/filtered"
import { fetchFunder, fetchFunderDocuments } from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  return {
    title: `${t('page title')} - Documents - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FunderDocumentsPageProps {
  params: { funder_id: string }
}

export default async function Page({ params }: FunderDocumentsPageProps) {
  const { funder_id } = params

  // Fetch only the data needed for documents tab
  const [funder, funderDocuments] = await Promise.all([
    fetchFunder(funder_id),
    fetchFunderDocuments(funder_id)
  ])
  
  if (!funder) {
    return redirect('/dashboard/funders')
  }

  const dataChanged = async () => {
    "use server"
    revalidateTag(`documents:funder:${funder_id}`)
  }

  return (
    <div>
      <FilteredDocuments
        dataChanged={dataChanged}
        documents={funderDocuments}
      />
    </div>
  )
}
