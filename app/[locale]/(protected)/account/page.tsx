"use server"
import { AccountForm } from "@/components/account-form"
import { getTranslations } from 'next-intl/server'
import { revalidateTag } from "next/cache"

const dataChanged = async (tag: string) => {
  "use server"
  revalidateTag(tag)
}

export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'AccountPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

export default async function Page() {

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <AccountForm callback={dataChanged} />
      </div>
    </div>
  )
}
