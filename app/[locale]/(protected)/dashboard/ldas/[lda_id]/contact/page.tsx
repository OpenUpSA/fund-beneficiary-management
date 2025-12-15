import { fetchLocalDevelopmentAgency, fetchContacts } from "@/lib/data"
import { FilteredContacts } from "@/components/contacts/filtered"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

interface LDAContactPageProps {
  params: { lda_id: string }
}

export async function generateMetadata({ params }: LDAContactPageProps): Promise<Metadata> {
  // Fetch LDA for metadata (Next.js will deduplicate with page fetch)
  try {
    const lda = await fetchLocalDevelopmentAgency(params.lda_id)
    return {
      title: `${lda?.name} | Contact List`,
    }
  } catch (error) {
    Sentry.captureException(error)
    return {
      title: 'Contact List',
    }
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
    return redirect('/dashboard/ldas')
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
