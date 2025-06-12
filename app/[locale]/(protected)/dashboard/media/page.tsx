import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { FilteredMedia } from "@/components/media/filtered"
import { fetchAllMedia, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { FormDialog } from "@/components/media/form"
import { revalidateTag } from "next/cache"

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

const dataChanged = async () => {
  "use server"
  revalidateTag('ldas')
}

export default async function Page() {
  const media = await fetchAllMedia()
  const ldas = await fetchLocalDevelopmentAgencies()

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Media", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Media</h1>
        <div className="space-x-2">
          <FormDialog
            ldas={ldas}
            callback={dataChanged} />
        </div>
      </div>
      <FilteredMedia
        media={media}
        dataChanged={dataChanged} />
    </div>
  )
}