import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

import { FilteredApplicationsAndReports } from "@/components/applications-and-reports/filtered"
import { SidebarTrigger } from "@/components/ui/sidebar"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'ApplicationsAndReportsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

export default function Page() {
  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbPage>Applications &amp; Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Applications &amp; Reports</h1>
        <div className="space-x-2">
          <Button>
            <span className="hidden md:inline">Add application</span>
            <PlusIcon />
          </Button>
        </div>
      </div>
      <FilteredApplicationsAndReports />
    </div>
  )
}