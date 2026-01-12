import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchMedia } from "@/lib/data"
import { FormDialog } from "@/components/media/form"
import { DeleteDialog } from "@/components/media/delete"
import { revalidateTag } from "next/cache"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"

import { ImageKitProvider } from '@imagekit/next'

import { Image } from '@imagekit/next'
import { Button } from "@/components/ui/button"
import { DownloadIcon } from "lucide-react"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { LDA_TERMINOLOGY } from "@/constants/lda"

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

interface Props {
  params: { media_id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

interface BreadcrumbLink {
  label: string
  href?: string
  isCurrent?: boolean
}

export default async function Page({ params, searchParams }: Props) {
  const media = await fetchMedia(params.media_id)
  const imagekitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!
  const { from } = searchParams

  let breadcrumbLinks: BreadcrumbLink[] = [
    { label: "Media", href: "/dashboard/media" },
    { label: media.title, isCurrent: true }
  ]

  if (from && typeof from === 'string') {
    if(from==="lda") {
      if (media?.localDevelopmentAgency?.id) {
        breadcrumbLinks = [{
          label: media?.localDevelopmentAgency.name,
          href: `/dashboard/ldas/${media?.localDevelopmentAgency.id}`
        }, ...breadcrumbLinks]
      }
    }
  }

  return (
    <div className="space-y-4">
      <BreadcrumbNav
        className="mb-4"
        links={breadcrumbLinks}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">{media.title}</h1>
        <div className="space-x-2">
          <FormDialog
            media={media}
            callback={dataChanged} />
          <Button asChild>
            <a href={`/api/media/${media.id}/file`} download>
              <span className="hidden md:inline">Download</span>
              <DownloadIcon />
            </a>
          </Button>
          <DeleteDialog media={media} callback={dataChanged} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="sm:flex gap-4">
          <Card className="w-full sm:w-[0.5]">
            <CardContent className="pt-2 space-y-2 text-sm py-4">
              <div className="flex justify-between">
                <span className="font-medium">Media Type:</span>
                <span>{media.mediaType}</span>
              </div>
              {media?.localDevelopmentAgency && <div className="flex justify-between">
                <span className="font-medium">{LDA_TERMINOLOGY.fullName}:</span>
                <span>{media?.localDevelopmentAgency?.name}</span>
              </div>}
              <div className="flex justify-between">
                <span className="font-medium">Created At:</span>
                <span>{format(media.createdAt, 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Updated At:</span>
                <span>{format(media.updatedAt, 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Description:</span>
              </div>
              <div className="flex justify-between">
                <span>{media.description}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardContent className="p-5">
              <a href={`/api/media/${media.id}/file`} target="_blank">
                <ImageKitProvider urlEndpoint={imagekitUrlEndpoint}>
                  <Image
                    src={media.filePath}
                    alt={media.title}
                    width={5000}
                    height={5000}
                    responsive={true}
                    className="w-full h-auto border"
                  />
                </ImageKitProvider>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}