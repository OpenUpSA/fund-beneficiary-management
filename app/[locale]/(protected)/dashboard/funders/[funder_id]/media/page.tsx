import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredMedia } from "@/components/media/filtered"
import { 
  fetchFunder,
  fetchFunderMedia,
  fetchMediaSourceTypes,
  fetchUsers
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  return {
    title: `${t('page title')} - Media - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FunderMediaPageProps {
  params: { funder_id: string }
}

export default async function Page({ params }: FunderMediaPageProps) {
  const { funder_id } = params

  // Fetch only the data needed for media tab
  const [funder, funderMedia, mediaSourceTypes, users] = await Promise.all([
    fetchFunder(funder_id),
    fetchFunderMedia(funder_id),
    fetchMediaSourceTypes(),
    fetchUsers()
  ])
  
  if (!funder) {
    return redirect('/dashboard/funders')
  }

  const dataChanged = async (media_id?: string) => {
    "use server"
    revalidateTag('media:list')
    revalidateTag(`media:funder:${funder_id}`)
    if (media_id) {
      revalidateTag(`media:detail:${media_id}`)
    }
  }

  return (
    <div>
      <FilteredMedia
        dataChanged={dataChanged}
        media={funderMedia}
        funder={{ id: parseInt(funder_id), name: funder.name }}
        mediaSourceTypes={mediaSourceTypes}
        users={users}
      />
    </div>
  )
}
