import { fetchLocalDevelopmentAgency, fetchContacts } from "@/lib/data"
import { FilteredContacts } from "@/components/contacts/filtered"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

interface LDAContactPageProps {
  params: { lda_id: string }
}

export async function generateMetadata({ params }: LDAContactPageProps): Promise<Metadata> {
  try {
    const lda = await fetchLocalDevelopmentAgency(params.lda_id)
    return {
      title: `${lda.name} | Contact List`,
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
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)
  const contacts = await fetchContacts(lda_id)

  const dataChanged = async () => {
    "use server"
    revalidateTag(`lda:detail:${lda_id}`)
    revalidateTag(`contacts:lda:${lda_id}`)
  }

  return (
    <div className="space-y-4">
      <FilteredContacts lda={lda} contacts={contacts} dataChanged={dataChanged} />
    </div>
  )
}
