import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"

import { FilteredLDAs } from "@/components/ldas/filtered"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { fetchDevelopmentStages, fetchFocusAreas, fetchFundingStatuses, fetchFunds, fetchLocalDevelopmentAgencies, fetchLocations, fetchUsers } from "@/lib/data"
import { FormDialog } from "@/components/ldas/form"
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

export default async function Page() {
  const funds = await fetchFunds()
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()
  const ldas = await fetchLocalDevelopmentAgencies()
  const developmentStages = await fetchDevelopmentStages()
  const programmeOfficers = await fetchUsers()

  const dataChanged = async (tag: string) => {
    "use server"
    revalidateTag(tag)
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbPage>LDAs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Local Development Agencies</h1>
        <div className="space-x-2">
          <FormDialog
            funds={funds}
            fundingStatuses={fundingStatuses}
            locations={locations}
            focusAreas={focusAreas}
            developmentStages={developmentStages}
            programmeOfficers={programmeOfficers}
            callback={dataChanged} />
        </div>
      </div>
      <FilteredLDAs ldas={ldas} />
    </div>
  )
}