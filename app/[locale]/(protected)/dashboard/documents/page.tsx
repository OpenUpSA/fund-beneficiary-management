import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { FilteredDocuments } from "@/components/documents/filtered"
import { fetchAllDocuments, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { FormDialog } from "@/components/documents/form"
import { revalidateTag } from "next/cache"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'DocumentsPage' })

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
  const documents = await fetchAllDocuments()
  const ldas = await fetchLocalDevelopmentAgencies()

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Documents", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Documents</h1>
        <div className="space-x-2">
          <FormDialog
            ldas={ldas}
            callback={dataChanged} />
        </div>
      </div>
      <FilteredDocuments
        documents={documents}
        dataChanged={dataChanged} />
    </div>
  )
}