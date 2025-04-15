import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { FilteredMedia } from "@/components/media/filtered"

import { OrganisationDetails } from "@/components/organisations/details"
import { Contacts } from "@/components/contacts/list"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FilteredDocuments } from "@/components/documents/filtered"
import { Overview } from "@/components/funders/overview"
import { FilteredFunds } from "@/components/funds/filtered"
import { FilteredLDAs } from "@/components/ldas/filtered"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { FormDialog } from '@/components/funders/form'
import { fetchFocusAreas, fetchFunder, fetchFunderFunds, fetchFundingStatuses, fetchLocalDevelopmentAgencies, fetchLocations } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"
import { FormDialog as OrganisationDetailFormDialog } from "@/components/organisations/form"

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

interface FunderPageProps {
  params: { funder_id: string }
}

export default async function Page({ params }: FunderPageProps) {
  const { funder_id } = params
  const funder = await fetchFunder(funder_id)
  const funds = await fetchFunderFunds(funder_id)
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()
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
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbLink href="/dashboard/funders">Funders</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{funder.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">{funder.name}</h1>
        <div className="space-x-2">
          <FormDialog
            funder={funder}
            fundingStatuses={fundingStatuses}
            locations={locations}
            focusAreas={focusAreas}
            callback={dataChanged} />
        </div>
      </div>
      <Tabs defaultValue="overview" className="pt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funds">Funds</TabsTrigger>
          <TabsTrigger value="funded">Funded LDAs</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-2">
          <Overview funder={funder} />
        </TabsContent>
        <TabsContent value="funds">
          <FilteredFunds funds={funds} />
        </TabsContent>
        <TabsContent value="funded">
          <FilteredLDAs ldas={ldas} />
        </TabsContent>
        <TabsContent value="contact">
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
        </TabsContent>
        <TabsContent value="documents">
          <FilteredDocuments />
        </TabsContent>
        <TabsContent value="media">
          <FilteredMedia />
        </TabsContent>
      </Tabs>
    </div >
  )
}