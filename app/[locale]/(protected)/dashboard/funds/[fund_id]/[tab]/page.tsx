import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation";
import { Overview } from "@/components/funds/overview";
import { FilteredLDAs } from "@/components/ldas/filtered";
import { FilteredForms } from "@/components/forms/filtered";
import { Contacts } from "@/components/contacts/list";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FilteredDocuments } from "@/components/documents/filtered";
import { FilteredMedia } from "@/components/media/filtered";
import { fetchFund, fetchLocalDevelopmentAgencies, fetchFocusAreas, fetchDevelopmentStages, fetchUsers, fetchProvinces, fetchFundingStatuses } from "@/lib/data";
import { FormDialog as ContactFormDialog } from "@/components/contacts/form";
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
  const validTabs = ["overview", "ldas", "forms", "contacts", "documents", "media"]
  if (!validTabs.includes(tab)) {
    redirect(`/dashboard/funds/${fund_id}/overview`)
  }

  const fund = await fetchFund(fund_id);
  const ldas = await fetchLocalDevelopmentAgencies();
  const focusAreas = await fetchFocusAreas()
  const developmentStages = await fetchDevelopmentStages()
  const programmeOfficers = await fetchUsers()
  const provinces = await fetchProvinces()
  const fundingStatus = await fetchFundingStatuses()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds');
  };

  const contactConnectCommand = {
    funds: {
      connect: {
        id: fund.id,
      },
    },
  };

  return (
    <div>
      {/* Tab Content */}
      <div>
        {(() => {
          switch (tab) {
            case "overview":
              return <Overview fund={fund} />;

            case "ldas":
              return <FilteredLDAs 
                ldas={ldas} 
                focusAreas={focusAreas} 
                developmentStages={developmentStages} 
                programmeOfficers={programmeOfficers} 
                provinces={provinces} 
                fundingStatus={fundingStatus} 
              />;

            case "forms":
              return <FilteredForms />;

            case "contacts":
              return (
                <Card className="w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span>Contacts</span>
                      <div>
                        <ContactFormDialog
                          connectOnCreate={contactConnectCommand}
                          callback={dataChanged} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Contacts contacts={fund.contacts} />
                  </CardContent>
                </Card>
              );

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
