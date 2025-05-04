import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { FilteredApplicationsAndReports } from "@/components/applications-and-reports/filtered"
import { FilteredMedia } from "@/components/media/filtered"

import { OrganisationDetails } from "@/components/organisations/details"
import { Contacts } from "@/components/contacts/list"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FilteredDocuments } from "@/components/documents/filtered"
import { Overview } from "@/components/ldas/overview"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { fetchDevelopmentStages, fetchFocusAreas, fetchFundingStatuses, fetchFunds, fetchLocalDevelopmentAgency, fetchLocations, fetchUsers } from "@/lib/data"
import { FormDialog } from "@/components/ldas/form"
import { FormDialog as OrganisationDetailFormDialog } from "@/components/organisations/form"
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"
import { revalidateTag } from "next/cache"


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

interface LDAPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAPageProps) {
  const { lda_id } = params
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  const funds = await fetchFunds()
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()
  const developmentStages = await fetchDevelopmentStages()
  const programmeOfficers = await fetchUsers()

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
            <BreadcrumbPage>{lda.name}</BreadcrumbPage>
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
      <Tabs defaultValue="overview" className="pt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applicationsAndReports">Applications &amp; Reports</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-2">
          <Overview lda={lda} />
        </TabsContent>
        <TabsContent value="applicationsAndReports">
          <FilteredApplicationsAndReports />
        </TabsContent>
        <TabsContent value="contact">
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
        </TabsContent>
        <TabsContent value="documents">
          <FilteredDocuments />
        </TabsContent>
        <TabsContent value="media">
          <FilteredMedia
            media={lda.media}
            lda={lda}
            dataChanged={dataChanged} />
        </TabsContent>
      </Tabs>
    </div >
  )
}