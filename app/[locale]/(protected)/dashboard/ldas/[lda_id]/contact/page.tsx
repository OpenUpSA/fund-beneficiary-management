import { getTranslations } from "next-intl/server"
import { OrganisationDetails } from "@/components/organisations/details"
import { Contacts } from "@/components/contacts/list"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { fetchLocalDevelopmentAgency } from "@/lib/data"
import { FormDialog as OrganisationDetailFormDialog } from "@/components/organisations/form"
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'LDAsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

interface LDAContactPageProps {
  params: { lda_id: string }
}

export default async function Page({ params }: LDAContactPageProps) {
  const { lda_id } = params
  
  // Fetch LDA data
  const lda = await fetchLocalDevelopmentAgency(lda_id)

  const dataChanged = async () => {
    "use server"
    revalidateTag(`lda-${lda_id}`)
  }

  const contactConnectCommand = {
    localDevelopmentAgencies: {
      connect: {
        id: lda.id
      },
    }
  }

  return (
    <div className="sm:flex gap-4 mt-4">
      <Card className="w-full sm:w-[40rem]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span>Organisation</span>
            <div>
              <OrganisationDetailFormDialog
                organisationDetail={lda.organisationDetail}
                callback={dataChanged} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-2 text-sm">
          <OrganisationDetails
            organisationDetail={lda.organisationDetail} />
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span>Leadership</span>
            <div>
              <ContactFormDialog
                connectOnCreate={contactConnectCommand}
                callback={dataChanged} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Contacts
            contacts={lda.contacts} />
        </CardContent>
      </Card>
    </div>
  )
}
