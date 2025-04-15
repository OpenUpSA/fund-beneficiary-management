import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

import { FilteredMedia } from "@/components/media/filtered"
import { SidebarTrigger } from "@/components/ui/sidebar"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'MediaPage' })

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
        <h1 className="text-xl md:text-2xl font-semibold">Media</h1>
        <div className="space-x-2">
          <Button>
            <span className="hidden md:inline">Add media</span>
            <PlusIcon />
          </Button>
        </div>
      </div>
      <FilteredMedia />
    </div>
  )
}