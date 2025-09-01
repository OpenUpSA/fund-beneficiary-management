import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { FilteredMedia } from "@/components/media/filtered"
import { fetchAllMedia, fetchLocalDevelopmentAgencies, fetchMediaSourceTypes } from "@/lib/data"
import { FormDialog } from "@/components/media/form"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'MediaPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

const dataChanged = async (media_id?: string) => {
  "use server"
  revalidateTag('media:list')
  if (media_id) {
    revalidateTag(`media:detail:${media_id}`)
  }
}

export default async function Page() {
  const media = await fetchAllMedia()
  const ldas = await fetchLocalDevelopmentAgencies()
  const mediaSourceTypes = await fetchMediaSourceTypes()

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Media", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Media</h1>
        <div className="space-x-2">
          <FormDialog
            ldas={ldas}
            callback={dataChanged}
            mediaSourceTypes={mediaSourceTypes} />
        </div>
      </div>
      <FilteredMedia
        media={media}
        dataChanged={dataChanged}
        mediaSourceTypes={mediaSourceTypes} />
    </div>
  )
}