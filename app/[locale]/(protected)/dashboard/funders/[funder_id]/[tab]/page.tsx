import { getTranslations } from "next-intl/server"
import { FilteredMedia } from "@/components/media/filtered"
import { OrganisationDetails } from "@/components/organisations/details"
import { Contacts } from "@/components/contacts/list"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FilteredDocuments } from "@/components/documents/filtered"
import { Overview } from "@/components/funders/overview"
import { FilteredFunds } from "@/components/funds/filtered"
import { FilteredLDAs } from "@/components/ldas/filtered"
import { 
  fetchFunder, 
  fetchFunderFunds, 
  fetchLocalDevelopmentAgencies
} from "@/lib/data"
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"
import { FormDialog as OrganisationDetailFormDialog } from "@/components/organisations/form"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

export async function generateMetadata({ params: { locale, funder_id }
}: Readonly<{
  params: { locale: string, funder_id: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FunderPage' })

  const funder = await fetchFunder(funder_id)

  return {
    title: `${funder.name} - ${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

interface FunderTabPageProps {
  params: { funder_id: string, tab: string }
}

export default async function Page({ params }: FunderTabPageProps) {
  const { funder_id, tab } = params
  
  // Validate tab parameter
  const validTabs = ["overview", "funds", "funded", "contact", "documents", "media"]
  if (!validTabs.includes(tab)) {
    redirect(`/dashboard/funders/${funder_id}/overview`)
  }
  
  const funder = await fetchFunder(funder_id)
  const funds = await fetchFunderFunds(funder_id)
  const ldas = await fetchLocalDevelopmentAgencies()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funders')
  }

  const contactConnectCommand = {
    funders: {
      connect: {
        id: funder.id
      },
    }
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
              return <FilteredLDAs ldas={ldas} />;
              
            case "contact":
              return (
                <div className="sm:flex gap-4 mt-4">
                  <Card className="w-full sm:w-[40rem]">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <span>Organisation</span>
                        <div>
                          <OrganisationDetailFormDialog
                            organisationDetail={funder.organisationDetail}
                            callback={dataChanged} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-2 text-sm">
                      <OrganisationDetails organisationDetail={funder.organisationDetail} />
                    </CardContent>
                  </Card>
                  <Card className="w-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <span>Leadership</span>
                        <div>
                          <ContactFormDialog
                            connectOnCreate={contactConnectCommand}
                            callback={dataChanged} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Contacts
                        contacts={funder.contacts} />
                    </CardContent>
                  </Card>
                </div>
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