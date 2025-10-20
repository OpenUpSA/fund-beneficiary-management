import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
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
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunds } from "@/lib/permissions"

interface FundLayoutProps {
  children: React.ReactNode
  params: { fund_id: string }
}

export default async function Layout({ children, params }: FundLayoutProps) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;

  if (!canViewFunds(user)) {
    redirect('/404')
  }

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
      <BreadcrumbNav 
        className="mb-4"
        links={[
          { label: "Funds", href: "/dashboard/funds" },
          { label: fund.name, isCurrent: true }
        ]}
      />

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