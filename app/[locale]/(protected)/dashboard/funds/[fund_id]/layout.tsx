import { FundsTabs } from "@/components/funds/tabs"
import { FormDialog } from '@/components/funds/form'
import { DynamicBreadcrumb } from "@/components/ui/dynamic-breadcrumb"
import { revalidateTag } from "next/cache"
import { 
  fetchFocusAreas, 
  fetchFund,
  fetchProvinces
} from "@/lib/data"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunds } from "@/lib/permissions"
import { LDA_TERMINOLOGY } from "@/constants/lda"

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
  
  // Fetch all data in parallel for better performance
  const [fund, focusAreas, provinces] = await Promise.all([
    fetchFund(fund_id),
    fetchFocusAreas(),
    fetchProvinces()
  ])

  const dataChanged = async () => {
    "use server"
    revalidateTag('funds')
  }

  // Tab label mapping for breadcrumbs
  const tabLabels = {
    'overview': 'Overview',
    'funders': 'Funders',
    'ldas': LDA_TERMINOLOGY.fundedLabel,
    'applications': 'Applications & Reports',
    'documents': 'Documents',
    'media': 'Media'
  }

  return (
    <div>
      <DynamicBreadcrumb
        basePath="/dashboard/funds"
        entityName={fund.name}
        entityPath={`/dashboard/funds/${fund_id}`}
        tabLabels={tabLabels}
      />
      
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">{fund.name}</h1>
        <div className="space-x-2">
          <FormDialog
            fund={fund}
            focusAreas={focusAreas}
            provinces={provinces}
            callback={dataChanged} />
        </div>
      </div>
      
      <FundsTabs fundId={fund_id} className="pt-4" />
      {children}
    </div>
  )
}