import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { LDATabs } from "@/components/ldas/tabs"
import { FormDialog } from "@/components/ldas/form"
import { revalidateTag } from "next/cache"
import 'leaflet/dist/leaflet.css';
import { 
  fetchDevelopmentStages, 
  fetchFocusAreas, 
  fetchLocalDevelopmentAgency,
  fetchUsers,
  fetchProvinces
} from "@/lib/data"

interface LDALayoutProps {
  children: React.ReactNode
  params: { lda_id: string }
}

export default async function Layout({ children, params }: LDALayoutProps) {
  const { lda_id } = params
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  const focusAreas = await fetchFocusAreas()
  const developmentStages = await fetchDevelopmentStages()
  const programmeOfficers = await fetchUsers()
  const provinces = await fetchProvinces()

  const dataChanged = async (ldaId?: number) => {
    "use server"
    
    if (ldaId) {
      revalidateTag(`lda:detail:${ldaId}`)
      revalidateTag('lda-forms:list')
      revalidateTag(`lda-forms:lda:${ldaId}:list`)
    } else {
      revalidateTag('ldas:list')
      revalidateTag('lda-forms:list')
    }
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
            focusAreas={focusAreas}
            developmentStages={developmentStages}
            programmeOfficers={programmeOfficers}
            provinces={provinces}
            callback={dataChanged} />
        </div>
      </div>
      
      <LDATabs ldaId={lda_id} className="pt-4" />
      {children}
    </div>
  )
}
