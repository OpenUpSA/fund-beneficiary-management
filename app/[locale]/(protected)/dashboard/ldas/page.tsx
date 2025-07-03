import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { FilteredLDAs } from "@/components/ldas/filtered"
import { fetchDevelopmentStages, fetchFocusAreas, fetchLocalDevelopmentAgencies, fetchUsers, fetchProvinces } from "@/lib/data"
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
  const focusAreas = await fetchFocusAreas()
  const ldas = await fetchLocalDevelopmentAgencies()
  const developmentStages = await fetchDevelopmentStages()
  const programmeOfficers = await fetchUsers()
  const provinces = await fetchProvinces()

  const dataChanged = async (tag: string) => {
    "use server"
    revalidateTag(tag)
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "LDAs", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Local Development Agencies</h1>
        <div className="space-x-2">
          <FormDialog
            focusAreas={focusAreas}
            developmentStages={developmentStages}
            programmeOfficers={programmeOfficers}
            provinces={provinces}
            callback={dataChanged} />
        </div>
      </div>
      <FilteredLDAs ldas={ldas} />
    </div>
  )
}