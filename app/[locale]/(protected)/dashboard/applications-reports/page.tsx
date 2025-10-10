import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { FilteredLDAForms } from "@/components/lda-forms/filtered"

import { FormDialog } from "@/components/lda-forms/form"
import { revalidateTag } from "next/cache"
import { FormTemplateWithRelations, LocalDevelopmentAgencyFormFull, LocalDevelopmentAgencyFull } from "@/types/models"
import { fetchAllLocalDevelopmentAgencyForms, fetchFormStatuses, fetchFormTemplates, fetchLocalDevelopmentAgencies } from "@/lib/data"
import { FormStatus } from "@prisma/client"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { redirect } from "next/navigation"

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FundingReportsPage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

export default async function Page() {

  redirect('/dashboard/ldas')

  // const formTemplates: FormTemplateWithRelations[] = await fetchFormTemplates()
  // const ldaForms: LocalDevelopmentAgencyFormFull[] = await fetchAllLocalDevelopmentAgencyForms()
  // const ldas: LocalDevelopmentAgencyFull[] = await fetchLocalDevelopmentAgencies()
  // const formStatuses: FormStatus[] = await fetchFormStatuses()

  // const dataChanged = async () => {
  //   "use server"
  //   revalidateTag('funders')
  // }

  // return (
  //   <div>
  //     <BreadcrumbNav
  //       className="mb-4"
  //       links={[
  //         { label: "Applications & Reports", isCurrent: true }
  //       ]}
  //     />
  //     <div className="flex flex-wrap items-center justify-between">
  //       <h1 className="text-xl md:text-2xl font-semibold">Applications &amp; Reports</h1>
  //       <div className="space-x-2">
  //         <FormDialog
  //           formTemplates={formTemplates}
  //           ldas={ldas}
  //           callback={dataChanged} />
  //       </div>
  //     </div>
  //     <FilteredLDAForms
  //       formTemplates={formTemplates}
  //       formStatuses={formStatuses}
  //       ldaForms={ldaForms}
  //       dataChanged={dataChanged}
  //     />
  //   </div>
  // )
}