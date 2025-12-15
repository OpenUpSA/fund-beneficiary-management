import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation";
import { Overview } from "@/components/funds/overview";
import { FilteredFundFunders } from "@/components/funds/filtered-funders";
import { FilteredFundLDAs } from "@/components/funds/funded-ldas";
import { FilteredLDAForms } from "@/components/lda-forms/filtered";
import { FilteredDocuments } from "@/components/documents/filtered";
import { FilteredMedia } from "@/components/media/filtered";
import { 
  fetchFund,
  fetchFunders,
  fetchLocalDevelopmentAgencies,
  fetchFundLDAForms,
  fetchFormTemplates,
  fetchFormStatuses,
  fetchFundDocuments,
  fetchFundMedia,
  fetchMediaSourceTypes,
  fetchUsers
} from "@/lib/data";
import { revalidateTag } from "next/cache";
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale, fund_id } }: Readonly<{ params: { locale: string, fund_id: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  const fund = await fetchFund(fund_id)

  return {
    title: `${fund.name} - ${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface FundTabPageProps {
  params: { fund_id: string; tab: string };
}

export default async function Page({ params }: FundTabPageProps) {
  const { fund_id, tab } = params;

  // Validate tab parameter
  const validTabs = ["overview", "funders", "ldas", "applications", "documents", "media"]
  if (!validTabs.includes(tab)) {
    redirect(`/dashboard/funds/${fund_id}/overview`)
  }

  // Fetch all data in parallel for better performance
  const [
    fund,
    allFunders,
    allLDAs,
    ldaForms,
    formTemplates,
    formStatuses,
    fundDocuments,
    fundMedia,
    mediaSourceTypes,
    users
  ] = await Promise.all([
    fetchFund(fund_id),
    fetchFunders(),
    fetchLocalDevelopmentAgencies(),
    fetchFundLDAForms(fund_id),
    fetchFormTemplates(),
    fetchFormStatuses(),
    fetchFundDocuments(fund_id),
    fetchFundMedia(fund_id),
    fetchMediaSourceTypes(),
    fetchUsers()
  ])
  
  const fundFunders = fund.fundFunders || [];
  const fundLocalDevelopmentAgencies = fund.fundLocalDevelopmentAgencies || [];
  
  // Calculate total allocated amount to LDAs
  const allocatedAmount = fundLocalDevelopmentAgencies.reduce((sum, lda) => {
    return sum + (lda.amount ? Number(lda.amount) : 0)
  }, 0)

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds');
    revalidateTag('lda-forms:list');
    revalidateTag(`fund-lda-forms:${fund_id}`);
    revalidateTag('media:list');
    revalidateTag(`media:fund:${fund_id}`);
  };

  return (
    <div>
      {/* Tab Content */}
      <div>
        {(() => {
          switch (tab) {
            case "overview":
              return <Overview fund={fund} />;

            case "funders":
              return <FilteredFundFunders 
                fundFunders={fundFunders}
                fundId={parseInt(fund_id)}
                fundName={fund.name}
                fundAmount={Number(fund.amount)}
                allocatedAmount={allocatedAmount}
                allFunders={allFunders}
                callback={dataChanged}
              />;

            case "ldas":
              return <FilteredFundLDAs 
                fundedLDAs={fundLocalDevelopmentAgencies} 
                fundId={parseInt(fund_id)}
                fundName={fund.name}
                fundAmount={Number(fund.amount)}
                fundDefaultAmount={fund.defaultAmount ? Number(fund.defaultAmount) : null}
                fundingCalculationType="total_funded_amount"
                funds={[]}
                availableLDAs={allLDAs.map(lda => ({ id: lda.id, name: lda.name }))}
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
                  documents={fundDocuments} />
              );

            case "media":
              return (
                <FilteredMedia
                  dataChanged={dataChanged}
                  media={fundMedia}
                  fund={{ id: parseInt(fund_id), name: fund.name }}
                  mediaSourceTypes={mediaSourceTypes}
                  users={users} />
              );

            default:
              return null;
          }
        })()}
      </div>
    </div>
  )
}
