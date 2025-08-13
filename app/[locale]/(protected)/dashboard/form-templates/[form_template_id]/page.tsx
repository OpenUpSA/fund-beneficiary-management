import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchFormTemplate } from "@/lib/data"
import Editor from "@/components/form-templates/editor"
import { revalidateTag } from "next/cache"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

interface FormTemplatePageProps {
  params: { form_template_id: string }
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
  const { form_template_id } = params
  const formTemplate = await fetchFormTemplate(form_template_id)

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={[
          { label: "Form Templates", href: "/dashboard/form-templates" },
          { label: formTemplate.name, isCurrent: true }
        ]}
      />
      <Editor formTemplate={formTemplate} dataChanged={dataChanged} />
    </div>
  )
}
