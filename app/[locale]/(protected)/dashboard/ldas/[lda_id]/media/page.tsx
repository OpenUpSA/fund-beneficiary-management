import { getTranslations } from "next-intl/server"
import { FilteredMedia } from "@/components/media/filtered"
import { fetchLocalDevelopmentAgency, fetchLDAMedia, fetchMediaSourceTypes, fetchUsers } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: `${LDA_TERMINOLOGY.shortNamePlural} - Media - ${tM('title')}`,
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
  
  // Fetch all data in parallel (LDA fetch will be deduplicated with layout)
  const [lda, media, mediaSourceTypes, users] = await Promise.all([
    fetchLocalDevelopmentAgency(lda_id),
    fetchLDAMedia(lda_id),
    fetchMediaSourceTypes(),
    fetchUsers()
  ])
  
  if (!lda) {
    return redirect(LDA_TERMINOLOGY.dashboardPath)
  }

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
