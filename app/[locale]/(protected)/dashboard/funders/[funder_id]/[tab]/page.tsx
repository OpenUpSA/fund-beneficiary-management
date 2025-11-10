import { getTranslations } from "next-intl/server"
import { FilteredMedia } from "@/components/media/filtered"
import { FilteredDocuments } from "@/components/documents/filtered"
import { FilteredLDAForms } from "@/components/lda-forms/filtered"
import { Overview } from "@/components/funders/overview"
import { ContributedFunds } from "@/components/funders/contributed-funds"
import { FilteredFundLDAs } from "@/components/funds/funded-ldas"
import {
  fetchFunder,
  fetchFunderLDAs,
  fetchFunderLDAForms,
  fetchFunds,
  fetchLocalDevelopmentAgencies,
  fetchFormTemplates,
  fetchFormStatuses,
  fetchFocusAreas
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
  const validTabs = ["overview", "funds", "funded", "applications", "documents", "media"]
  if (!validTabs.includes(tab)) {
    redirect(`/dashboard/funders/${funder_id}/overview`)
  }

  const funder = await fetchFunder(funder_id)
  const allFunds = await fetchFunds()
  const allLDAs = await fetchLocalDevelopmentAgencies()
  
  // Fetch all LDAs linked to this funder through its funds
  const funderLDAs = await fetchFunderLDAs(funder_id)
  
  // Fetch form-related data for applications tab
  const ldaForms = await fetchFunderLDAForms(funder_id)
  const formTemplates = await fetchFormTemplates()
  const formStatuses = await fetchFormStatuses()
  const focusAreas = await fetchFocusAreas()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funders')
    revalidateTag(`funder:${funder_id}:ldas`)
    revalidateTag(`funder-lda-forms:${funder_id}`)
    revalidateTag('lda-forms:list')
  }

  return (
    <div>
      {/* Tab Content */}
      <div>
        {(() => {
          switch (tab) {
            case "overview":
              return <Overview funder={funder} ldaCount={funderLDAs.length} />;

            case "funds":
              return <ContributedFunds
                fundFunders={funder.fundFunders}
                funderId={Number(funder_id)}
                funderName={funder.name}
                availableFunds={allFunds}
                focusAreas={focusAreas}
                callback={dataChanged}
              />;

            case "funded":
              return <FilteredFundLDAs 
                fundedLDAs={funderLDAs}
                fundingCalculationType="total_funded_amount"
                showLinkButton={false}
                availableLDAs={allLDAs.map(lda => ({ id: lda.id, name: lda.name }))}
                funds={allFunds.map(fund => ({ id: fund.id, label: fund.name }))}
                callback={dataChanged}
              />;

            case "applications":
              return <FilteredLDAForms 
                ldaForms={ldaForms}
                formTemplates={formTemplates}
                formStatuses={formStatuses}
                dataChanged={dataChanged}
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