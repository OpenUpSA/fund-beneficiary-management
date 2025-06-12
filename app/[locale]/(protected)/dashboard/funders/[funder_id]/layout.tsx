import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { FunderTabs } from "@/components/funders/tabs"
import { FormDialog } from "@/components/funders/form"
import { revalidateTag } from "next/cache"
import { 
  fetchFocusAreas, 
  fetchFunder,
  fetchFundingStatuses, 
  fetchLocations 
} from "@/lib/data"

interface FunderLayoutProps {
  children: React.ReactNode
  params: { funder_id: string }
}

export default async function Layout({ children, params }: FunderLayoutProps) {
  const { funder_id } = params
  const funder = await fetchFunder(funder_id)
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funders')
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Funders", href: "/dashboard/funders" },
          { label: funder.name, isCurrent: true }
        ]}
      />

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
      
      <FunderTabs funderId={funder_id} className="pt-4" />
      {children}
    </div>
  )
}
