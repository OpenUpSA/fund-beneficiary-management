import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { LDATabs } from "@/components/ldas/tabs"
import { FormDialog } from "@/components/ldas/form"
import { revalidateTag } from "next/cache"
import { 
  fetchDevelopmentStages, 
  fetchFocusAreas, 
  fetchFundingStatuses, 
  fetchFunds, 
  fetchLocalDevelopmentAgency,
  fetchLocations, 
  fetchUsers 
} from "@/lib/data"

interface LDALayoutProps {
  children: React.ReactNode
  params: { lda_id: string }
}

export default async function Layout({ children, params }: LDALayoutProps) {
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

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "LDAs", href: "/dashboard/ldas" },
          { label: lda.name, isCurrent: true }
        ]}
      />

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
      
      <LDATabs ldaId={lda_id} className="pt-4" />
      {children}
    </div>
  )
}
