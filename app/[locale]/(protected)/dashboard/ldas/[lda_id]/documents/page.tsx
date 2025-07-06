import { getTranslations } from "next-intl/server"
import { FilteredDocuments } from "@/components/documents/filtered"
import { fetchLocalDevelopmentAgency } from "@/lib/data"
import { revalidateTag } from "next/cache"

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'LDAsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

interface LDADocumentsPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDADocumentsPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)

  const dataChanged = async () => {
    "use server"
    revalidateTag('ldas')
  }

  return (
    <div>
      <FilteredDocuments
        documents={lda.documents}
        lda={lda}
        dataChanged={dataChanged}
        navigatedFrom="lda"
      />
    </div>
  )
}
