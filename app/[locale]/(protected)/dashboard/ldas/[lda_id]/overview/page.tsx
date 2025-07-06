import { getTranslations } from "next-intl/server"
import { Overview } from "@/components/ldas/overview"
import { fetchLocalDevelopmentAgency } from "@/lib/data"

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

interface LDAOverviewPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAOverviewPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)

  return (
    <div>
      <Overview lda={lda} />
    </div>
  )
}
