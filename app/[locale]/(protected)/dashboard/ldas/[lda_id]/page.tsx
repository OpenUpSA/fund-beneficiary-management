import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"


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

interface LDAPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAPageProps) {
  const { lda_id } = params

  console.log("HERE")
  
  // Redirect to the overview tab by default
  redirect(`/dashboard/ldas/${lda_id}/overview`)
}