import { getTranslations } from "next-intl/server"
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

interface LDAPageProps {
  params: { lda_id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function Page({ params, searchParams }: LDAPageProps) {
  const { lda_id } = params
  
  // Preserve query parameters (including referrer info) when redirecting
  const queryString = new URLSearchParams(
    Object.entries(searchParams).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = Array.isArray(value) ? value[0] : value
      }
      return acc
    }, {} as Record<string, string>)
  ).toString()
  
  const redirectUrl = queryString 
    ? `/dashboard/ldas/${lda_id}/overview?${queryString}`
    : `/dashboard/ldas/${lda_id}/overview`
  
  redirect(redirectUrl)
}