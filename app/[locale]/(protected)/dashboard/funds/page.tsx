"use server"
import { revalidateTag } from 'next/cache'
import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { FilteredFunds } from "@/components/funds/filtered"
import { fetchFocusAreas, fetchFunders, fetchFundingStatuses, fetchFunds, fetchLocations } from "@/lib/data"
import { FormDialog } from '@/components/funds/form'

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

export default async function Page() {
  const funds = await fetchFunds()
  const funders = await fetchFunders()
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds')
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Funds", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Funds</h1>
        <div className="space-x-2">
          <FormDialog funders={funders} fundingStatuses={fundingStatuses} locations={locations} focusAreas={focusAreas} callback={dataChanged} />
        </div>
      </div>
      <FilteredFunds funds={funds} />
    </div>
  )
}