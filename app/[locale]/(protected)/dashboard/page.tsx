import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { DownloadIcon, Share2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"

import { FilteredReport } from "@/components/dashboard/filtered"
import { SidebarTrigger } from "@/components/ui/sidebar"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'DashboardPage' })

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
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Reporting dashboard</h1>
        <div className="space-x-2">
          <Button variant="outline">
            <span className="hidden md:inline">Download</span>
            <DownloadIcon />
          </Button>
          <Button variant="outline">
            <span className="hidden md:inline">Share</span>
            <Share2Icon />
          </Button>
        </div>
      </div>
      <FilteredReport />
    </div>
  )
}