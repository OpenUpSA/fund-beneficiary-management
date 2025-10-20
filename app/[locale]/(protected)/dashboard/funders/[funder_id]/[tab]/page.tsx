import { getTranslations } from "next-intl/server"
import { FilteredMedia } from "@/components/media/filtered"
import { FilteredDocuments } from "@/components/documents/filtered"
import { Overview } from "@/components/funders/overview"
import { FilteredFunds } from "@/components/funds/filtered"
import { FilteredLDAs } from "@/components/ldas/filtered"
import {
  fetchFunder,
  fetchFunderFunds,
  fetchLocalDevelopmentAgencies,
  fetchFocusAreas,
  fetchDevelopmentStages,
  fetchUsers,
  fetchProvinces,
  fetchFundingStatuses
} from "@/lib/data"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale, funder_id } }: Readonly<{ params: { locale: string, funder_id: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  const funder = await fetchFunder(funder_id)

  return {
    title: `${funder.name} - ${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FunderTabPageProps {
  params: { funder_id: string, tab: string }
}

export default async function Page({ params }: FunderTabPageProps) {
  const { funder_id, tab } = params

  // Validate tab parameter
  const validTabs = ["overview", "funds", "funded", "documents", "media"]
  if (!validTabs.includes(tab)) {
    redirect(`/dashboard/funders/${funder_id}/overview`)
  }

  const funder = await fetchFunder(funder_id)
  const funds = await fetchFunderFunds(funder_id)
  const ldas = await fetchLocalDevelopmentAgencies()
  const focusAreas = await fetchFocusAreas()
  const developmentStages = await fetchDevelopmentStages()
  const programmeOfficers = await fetchUsers()
  const provinces = await fetchProvinces()
  const fundingStatus = await fetchFundingStatuses()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funders')
  }

  return (
    <div>
      {/* Tab Content */}
      <div>
        {(() => {
          switch (tab) {
            case "overview":
              return <Overview funder={funder} />;

            case "funds":
              return <FilteredFunds funds={funds} />;

            case "funded":
              return <FilteredLDAs 
                ldas={ldas} 
                focusAreas={focusAreas} 
                developmentStages={developmentStages} 
                programmeOfficers={programmeOfficers} 
                provinces={provinces} 
                fundingStatus={fundingStatus} 
              />;

            case "documents":
              return (
                <FilteredDocuments
                  dataChanged={dataChanged}
                  documents={[]} />
              );

            case "media":
              return (
                <FilteredMedia
                  dataChanged={dataChanged}
                  media={[]} />
              );

            default:
              return null;
          }
        })()}
      </div>
    </div>
  )
}