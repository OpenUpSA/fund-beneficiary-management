import { fetchLocalDevelopmentAgency, fetchContacts } from "@/lib/data"
import { FilteredContacts } from "@/components/contacts/filtered"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import type { Metadata } from 'next'
import { getTranslations } from "next-intl/server"

interface LDAContactPageProps {
  params: { lda_id: string, locale: string }
}

export async function generateMetadata({ params: { locale } }: LDAContactPageProps): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: `${LDA_TERMINOLOGY.shortNamePlural} - Contact List - ${tM('title')}`,
    description: tM('description'),
  }
}

export default async function Page({ params }: LDAContactPageProps) {
  const { lda_id } = params
  
  // Fetch LDA and contacts in parallel (LDA fetch will be deduplicated with layout)
  const [lda, contacts] = await Promise.all([
    fetchLocalDevelopmentAgency(lda_id),
    fetchContacts(lda_id)
  ])
  
  if (!lda) {
    return redirect(LDA_TERMINOLOGY.dashboardPath)
  }

  const dataChanged = async () => {
    "use server"
    revalidateTag(`lda:detail:${lda_id}`)
    revalidateTag(`contacts:lda:${lda_id}`)
  }

  return (
    <div className="space-y-4">
      <FilteredContacts ldaId={Number(lda_id)} contacts={contacts} dataChanged={dataChanged} />
    </div>
  )
}
