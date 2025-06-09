import { fetchLocalDevelopmentAgency } from "@/lib/data"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LDATabs } from "@/components/ldas/tabs"

interface LDALayoutProps {
  children: React.ReactNode
  params: { lda_id: string }
}

export default async function Layout({ children, params }: LDALayoutProps) {
  const { lda_id } = params
  const lda = await fetchLocalDevelopmentAgency(lda_id)

  console.log(lda);
  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbLink href="/dashboard/ldas">LDAs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{lda.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold">{lda.name}</h1>
      </div>
      
      <LDATabs ldaId={lda_id} className="mb-6" />
      
      {children}
    </div>
  )
}
