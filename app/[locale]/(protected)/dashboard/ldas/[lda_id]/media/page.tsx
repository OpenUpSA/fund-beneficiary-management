import { getTranslations } from "next-intl/server"
import { FilteredMedia } from "@/components/media/filtered"
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

interface LDAMediaPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAMediaPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)

  const dataChanged = async () => {
    "use server"
    revalidateTag('ldas')
  }

  return (
    <div>
      <FilteredMedia
        media={lda.media}
        lda={lda}
        dataChanged={dataChanged}
        navigatedFrom="lda"
      />
    </div>
  )
}
