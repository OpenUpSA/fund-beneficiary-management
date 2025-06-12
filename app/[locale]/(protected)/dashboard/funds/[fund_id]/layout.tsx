import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { FundsTabs } from "@/components/funds/tabs"
import { FormDialog } from '@/components/funds/form'
import { revalidateTag } from "next/cache"
import { 
  fetchFocusAreas, 
  fetchFund,
  fetchFunders,
  fetchFundingStatuses, 
  fetchLocations 
} from "@/lib/data"

interface FundLayoutProps {
  children: React.ReactNode
  params: { fund_id: string }
}

export default async function Layout({ children, params }: FundLayoutProps) {
  const { fund_id } = params
  const fund = await fetchFund(fund_id)
  const fundingStatuses = await fetchFundingStatuses()
  const locations = await fetchLocations()
  const focusAreas = await fetchFocusAreas()
  const funders = await fetchFunders()

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds')
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
          <FormDialog
            fund={fund}
            funders={funders}
            fundingStatuses={fundingStatuses}
            locations={locations}
            focusAreas={focusAreas}
            callback={dataChanged} />
        </div>
      </div>
      
      <FundsTabs fundId={fund_id} className="pt-4" />
      {children}
    </div>
  )
}