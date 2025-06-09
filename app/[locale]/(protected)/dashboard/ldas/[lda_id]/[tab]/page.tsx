import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { FilteredLDAForms } from "@/components/lda-forms/filtered"
import { FilteredMedia } from "@/components/media/filtered"
import { OrganisationDetails } from "@/components/organisations/details"
import { Contacts } from "@/components/contacts/list"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FilteredDocuments } from "@/components/documents/filtered"
import { Overview } from "@/components/ldas/overview"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { 
  fetchDevelopmentStages, 
  fetchFocusAreas, 
  fetchFormStatuses, 
  fetchFormTemplates, 
  fetchFundingStatuses, 
  fetchFunds, 
  fetchLocalDevelopmentAgency, 
  fetchLocalDevelopmentAgencyFormsForLDA, 
  fetchLocations, 
  fetchUsers 
} from "@/lib/data"
import { FormDialog } from "@/components/ldas/form"
import { FormDialog as OrganisationDetailFormDialog } from "@/components/organisations/form"
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"
import { revalidateTag } from "next/cache"
import { FormTemplateWithRelations, LocalDevelopmentAgencyFormFull } from "@/types/models"
import { FormStatus } from "@prisma/client"
import { redirect } from "next/navigation"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'LDAsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

interface LDATabPageProps {
  params: { lda_id: string, tab: string }
}

export default async function Page({ params }: LDATabPageProps) {
  const { lda_id, tab } = params

  console.log("TAB HERE");
  
  // Validate tab parameter
  const validTabs = ["overview", "applicationsAndReports", "contact", "documents", "media"]
  if (!validTabs.includes(tab)) {
    redirect(`/dashboard/ldas/${lda_id}/overview`)
  }
  
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  const funds = await fetchFunds()
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()
  const developmentStages = await fetchDevelopmentStages()
  const programmeOfficers = await fetchUsers()

  const formTemplates: FormTemplateWithRelations[] = await fetchFormTemplates()
  const ldaForms: LocalDevelopmentAgencyFormFull[] = await fetchLocalDevelopmentAgencyFormsForLDA(String(lda.id))
  const formStatuses: FormStatus[] = await fetchFormStatuses()

  const dataChanged = async () => {
    "use server"
    revalidateTag('ldas')
  }

  const contactConnectCommand = {
    localDevelopmentAgencies: {
      connect: {
        id: lda.id
      },
    }
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbLink href="/dashboard/ldas">LDAs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/dashboard/ldas/${lda_id}/overview`}>{lda.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {tab === "overview" && "Overview"}
              {tab === "applicationsAndReports" && "Applications & Reports"}
              {tab === "contact" && "Contact"}
              {tab === "documents" && "Documents"}
              {tab === "media" && "Media"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">{lda.name}</h1>
        <div className="space-x-2">
          <FormDialog
            lda={lda}
            funds={funds}
            fundingStatuses={fundingStatuses}
            locations={locations}
            focusAreas={focusAreas}
            developmentStages={developmentStages}
            programmeOfficers={programmeOfficers}
            callback={dataChanged} />
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="pt-4">
        {(() => {
          switch (tab) {
            case "overview":
              return <Overview lda={lda} />;
              
            case "applicationsAndReports":
              return (
                <FilteredLDAForms
                  formTemplates={formTemplates}
                  formStatuses={formStatuses}
                  lda={lda}
                  ldaForms={ldaForms}
                  dataChanged={dataChanged}
                />
              );
              
            case "contact":
              return (
                <div className="sm:flex gap-4 mt-4">
                  <Card className="w-full sm:w-[40rem]">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <span>Organisation</span>
                        <div>
                          <OrganisationDetailFormDialog
                            organisationDetail={lda.organisationDetail}
                            callback={dataChanged} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-2 text-sm">
                      <OrganisationDetails
                        organisationDetail={lda.organisationDetail} />
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
                        contacts={lda.contacts} />
                    </CardContent>
                  </Card>
                </div>
              );
              
            case "documents":
              return (
                <FilteredDocuments
                  documents={lda.documents}
                  lda={lda}
                  dataChanged={dataChanged}
                />
              );
              
            case "media":
              return (
                <FilteredMedia
                  media={lda.media}
                  lda={lda}
                  dataChanged={dataChanged}
                />
              );
              
            default:
              return null;
          }
        })()}
      </div>
    </div>
  )
}
