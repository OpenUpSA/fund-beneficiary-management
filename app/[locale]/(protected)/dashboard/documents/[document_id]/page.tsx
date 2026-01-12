import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchDocument } from "@/lib/data"
import { FormDialog } from "@/components/documents/form"
import { DeleteDialog } from "@/components/documents/delete"
import { revalidateTag } from "next/cache"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { DownloadIcon } from "lucide-react"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { LDA_TERMINOLOGY } from "@/constants/lda"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'DocumentPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

const dataChanged = async () => {
  "use server"
  revalidateTag('ldas')
}

interface Props {
  params: { document_id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

interface BreadcrumbLink {
  label: string
  href?: string
  isCurrent?: boolean
}

export default async function Page({ params, searchParams }: Props) {
  const document = await fetchDocument(params.document_id)
  const { from } = searchParams

  let breadcrumbLinks: BreadcrumbLink[] = [
    { label: document.title, isCurrent: true }
  ]

  if (from && typeof from === 'string') {
    if(from==="lda") {
      if (document?.localDevelopmentAgency?.id) {
        breadcrumbLinks = [{
          label: document?.localDevelopmentAgency.name,
          href: `/dashboard/ldas/${document?.localDevelopmentAgency.id}`
        },
        {
          label: "Documents",
          href: `/dashboard/ldas/${document?.localDevelopmentAgency.id}/documents`
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
        <h1 className="text-xl md:text-2xl font-semibold">{document.title}</h1>
        <div className="space-x-2">
          <FormDialog
            document={document}
            callback={dataChanged} />
          <Button asChild>
            <a href={`/api/document/${document.id}/file`} download>
              <span className="hidden md:inline">Download</span>
              <DownloadIcon />
            </a>
          </Button>
          <DeleteDialog document={document} callback={dataChanged} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="sm:flex gap-4">
          <Card className="w-full sm:w-[0.5]">
            <CardContent className="pt-2 space-y-2 text-sm py-4">
              <div className="flex justify-between">
                <span className="font-medium">Document Type:</span>
                <span>{document.documentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{LDA_TERMINOLOGY.fullName}:</span>
                <span>{document?.localDevelopmentAgency?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Created At:</span>
                <span>{format(document.createdAt, 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Updated At:</span>
                <span>{format(document.updatedAt, 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">File:</span>
                <span>{document.filePath}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader>Description</CardHeader>
            <CardContent>
              {document.description}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}