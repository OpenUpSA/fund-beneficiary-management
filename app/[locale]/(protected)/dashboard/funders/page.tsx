"use server"
import { revalidateTag } from 'next/cache'

import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { FilteredFunders } from "@/components/funders/filtered"

import { FormDialog } from '@/components/funders/form'
import { fetchFocusAreas, fetchFunders, fetchFundingStatuses, fetchLocations } from "@/lib/data"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundersPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

export default async function Page() {
  const funders = await fetchFunders()
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funders')
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Funders", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Funders</h1>
        <div className="space-x-2">
          <FormDialog fundingStatuses={fundingStatuses} locations={locations} focusAreas={focusAreas} callback={dataChanged} />
        </div>
      </div>
      <FilteredFunders funders={funders} />
    </div>
  )
}