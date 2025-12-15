import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { FilteredMedia } from "@/components/media/filtered"
import { 
  fetchFund,
  fetchFundMedia,
  fetchMediaSourceTypes,
  fetchUsers
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  return {
    title: `${t('page title')} - Media - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FundMediaPageProps {
  params: { fund_id: string }
}

export default async function Page({ params }: FundMediaPageProps) {
  const { fund_id } = params

  // Fetch only the data needed for media tab
  const [fund, fundMedia, mediaSourceTypes, users] = await Promise.all([
    fetchFund(fund_id),
    fetchFundMedia(fund_id),
    fetchMediaSourceTypes(),
    fetchUsers()
  ])
  
  if (!fund) {
    return redirect('/dashboard/funds')
  }

  const dataChanged = async (media_id?: string) => {
    "use server"
    revalidateTag('media:list')
    revalidateTag(`media:fund:${fund_id}`)
    if (media_id) {
      revalidateTag(`media:detail:${media_id}`)
    }
  }

  return (
    <div>
      <FilteredMedia
        dataChanged={dataChanged}
        media={fundMedia}
        fund={{ id: parseInt(fund_id), name: fund.name }}
        mediaSourceTypes={mediaSourceTypes}
        users={users}
      />
    </div>
  )
}
