import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchLDAForm } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { LocalDevelopmentAgencyFormFull } from "@/types/models"
import Filler from "@/components/lda-forms/data-filler"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

interface FormTemplatePageProps {
  params: { lda_form_id: string }
}

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>): Promise<Metadata> {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FormTemplatePage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description'),
    other: {
      ...Sentry.getTraceData(),
    }
  }
}

const dataChanged = async () => {
  "use server"
  revalidateTag('ldas')
}

export default async function Page({ params }: FormTemplatePageProps) {
  const { lda_form_id } = params
  const ldaForm: LocalDevelopmentAgencyFormFull = await fetchLDAForm(lda_form_id)

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Applications & Reports", href: "/dashboard/applications-reports" },
          { label: ldaForm.title, href: `/dashboard/applications-reports/${ldaForm.id}/` },
          { label: "Fill", isCurrent: true }
        ]}
      />
      <Filler
        ldaForm={ldaForm}
        callback={dataChanged} />
    </div>
  )
}
