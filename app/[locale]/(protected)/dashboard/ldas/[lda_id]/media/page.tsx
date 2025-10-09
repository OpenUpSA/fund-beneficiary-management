import { getTranslations } from "next-intl/server"
import { FilteredMedia } from "@/components/media/filtered"
import { fetchLocalDevelopmentAgency, fetchLDAMedia, fetchMediaSourceTypes, fetchUsers } from "@/lib/data"
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

interface LDAMediaPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAMediaPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  if (!lda) {
    return redirect(`/dashboard/ldas`)
  }

  const media = await fetchLDAMedia(lda_id)
  const mediaSourceTypes = await fetchMediaSourceTypes()
  const users = await fetchUsers()

  const dataChanged = async (media_id?: string) => {
    "use server"
    revalidateTag(`media:lda:${lda_id}`)
    if (media_id) {
      revalidateTag(`media:detail:${media_id}`)
    }
  }

  return (
    <div>
      <FilteredMedia
        media={media}
        lda={lda}
        dataChanged={dataChanged}
        navigatedFrom="lda"
        mediaSourceTypes={mediaSourceTypes}
        users={users}
      />
    </div>
  )
}
