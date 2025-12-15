import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { FunderTabs } from "@/components/funders/tabs"
import { FormDialog } from "@/components/funders/form"
import { revalidateTag } from "next/cache"
import { 
  fetchFocusAreas, 
  fetchFunder,
  fetchProvinces
} from "@/lib/data"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunders } from "@/lib/permissions"

interface FunderLayoutProps {
  children: React.ReactNode
  params: { funder_id: string }
}

export default async function Layout({ children, params }: FunderLayoutProps) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;

  if (!canViewFunders(user)) {
    redirect('/404')
  }

  const { funder_id } = params
  
  // Fetch all data in parallel for better performance
  const [funder, focusAreas, provinces] = await Promise.all([
    fetchFunder(funder_id),
    fetchFocusAreas(),
    fetchProvinces()
  ])

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
            focusAreas={focusAreas}
            provinces={provinces}
            callback={dataChanged} />
        </div>
      </div>
      
      <FunderTabs funderId={funder_id} className="pt-4" />
      {children}
    </div>
  )
}
