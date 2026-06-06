import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { fetchFormTemplates } from "@/lib/data"

import { FormTemplateWithRelations } from "@/types/models"
import { CreateTemplateButton } from "@/components/form-templates/form"
import { FilteredFormTemplates } from "@/components/form-templates/filtered"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

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


export default async function Page() {
  const formTemplates: FormTemplateWithRelations[] = await fetchFormTemplates()

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Form Templates", isCurrent: true }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Form Templates</h1>
        <div className="space-x-2">
          <CreateTemplateButton allTemplates={formTemplates}/>
        </div>
      </div>
      <FilteredFormTemplates formTemplates={formTemplates} />
    </div>
  )
}