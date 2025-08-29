import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { FilteredLDAs } from "@/components/ldas/filtered"
import { fetchDevelopmentStages, fetchFocusAreas, fetchFundingStatuses, fetchLocalDevelopmentAgencies, fetchProvinces, fetchUsers } from "@/lib/data"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react"

// Dynamically import the map component to avoid SSR issues with Leaflet
const LDAMap = dynamic(
  () => import("@/components/ldas/map/lda-map"),
  { ssr: false }
);

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

export default async function Page() {
  const [
    focusAreas,
    ldas,
    developmentStages,
    programmeOfficers,
    provinces,
    fundingStatus,
  ] = await Promise.all([
    fetchFocusAreas(),
    fetchLocalDevelopmentAgencies(),
    fetchDevelopmentStages(),
    fetchUsers(),
    fetchProvinces(),
    fetchFundingStatuses(),
  ])

  const dataChanged = async (ldaId?: number) => {
    "use server"
    if (ldaId) {
      revalidateTag(`ldas:details:${ldaId}`)
      revalidateTag(`lda-forms:lda:${ldaId}:list`)
    } else {
      revalidateTag('ldas:list')
      revalidateTag('lda-forms:list')
    }
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "LDAs", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Local Development Agencies</h1>
      </div>
      
      {/* Map Card */}
      <Card className="mb-6 hidden md:block">
        <CardContent className="p-0">
        <Suspense fallback={<div style={{height: 400}} className="w-full animate-pulse bg-muted" />}>
          <LDAMap 
            ldas={ldas} 
            height="400px" 
            width="100%" 
          />
        </Suspense>
        </CardContent>
      </Card>
      
      <FilteredLDAs
        ldas={ldas}
        focusAreas={focusAreas}
        developmentStages={developmentStages}
        programmeOfficers={programmeOfficers}
        provinces={provinces}
        fundingStatus={fundingStatus}
        callback={dataChanged}
      />
    </div>
  )
}