import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { fetchFormTemplates } from "@/lib/data"

import { FormTemplateWithRelations } from "@/types/models"
import { CreateTemplateButton } from "@/components/form-templates/form"
import { FilteredFormTemplates } from "@/components/form-templates/filtered"
import * as Sentry from '@sentry/nextjs'
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { FolderTreeIcon } from "lucide-react"
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
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const isSuperUser = !!session?.user && permissions.isSuperUser(session.user)

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
          {isSuperUser && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/form-templates/categories">
                <FolderTreeIcon className="h-4 w-4" />
                Categories
              </Link>
            </Button>
          )}
          <CreateTemplateButton allTemplates={formTemplates}/>
        </div>
      </div>
      <FilteredFormTemplates formTemplates={formTemplates} />
    </div>
  )
}