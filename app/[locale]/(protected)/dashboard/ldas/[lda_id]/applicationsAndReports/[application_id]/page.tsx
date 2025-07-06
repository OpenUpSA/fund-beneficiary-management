import { getTranslations } from "next-intl/server"

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

export default async function Page() {
  // The layout.tsx already handles displaying the form details
  // We just need an empty component here to satisfy the route structure
  return null
}