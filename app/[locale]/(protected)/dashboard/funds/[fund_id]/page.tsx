import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { FilteredMedia } from "@/components/media/filtered"
import { OrganisationDetails } from "@/components/organisations/details"
import { Contacts } from "@/components/contacts/list"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FilteredDocuments } from "@/components/documents/filtered"
import { Overview } from "@/components/funds/overview"
import { FilteredLDAs } from "@/components/ldas/filtered"
import { FilteredForms } from "@/components/forms/filtered"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { fetchFocusAreas, fetchFund, fetchFundingStatuses, fetchLocalDevelopmentAgencies, fetchLocations } from "@/lib/data"

import { FormDialog } from '@/components/funds/form'
import { revalidateTag } from "next/cache"

import { FormDialog as OrganisationDetailFormDialog } from "@/components/organisations/form"
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

interface FundPageProps {
  params: { fund_id: string }
}

export default async function Page({ params }: FundPageProps) {
  const { fund_id } = params
  const fund = await fetchFund(fund_id)
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()
  const ldas = await fetchLocalDevelopmentAgencies()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds')
  }

  const contactConnectCommand = {
    funds: {
      connect: {
        id: fund.id
      },
    }
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbLink href="/dashboard/funds">Funds</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{fund.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">{fund.name}</h1>
        <div className="space-x-2">
          <FormDialog fund={fund} fundingStatuses={fundingStatuses} locations={locations} focusAreas={focusAreas} callback={dataChanged} />
        </div>
      </div>
      <Tabs defaultValue="overview" className="pt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ldas">LDAs</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview fund={fund} />
        </TabsContent>
        <TabsContent value="ldas">
          <FilteredLDAs ldas={ldas} />
        </TabsContent>
        <TabsContent value="forms">
          <FilteredForms />
        </TabsContent>
        <TabsContent value="contacts">
          <Card className="w-full">
            <CardHeader>Contacts</CardHeader>
            <CardContent>
              <Contacts contacts={fund.contacts} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <FilteredDocuments dataChanged={dataChanged} documents={[]} />
        </TabsContent>
        <TabsContent value="media">
          <FilteredMedia dataChanged={dataChanged} media={[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
