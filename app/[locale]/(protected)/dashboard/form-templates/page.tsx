import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

import { fetchFormTemplates } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/routing"

import { FormTemplateWithRelations } from "@/types/models"
import { CreateTemplateButton } from "@/components/form-templates/form"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'

// Acronyms that should stay fully uppercased when formatting category slugs.
const CATEGORY_ACRONYMS = new Set(["dft", "fris", "lda", "scat", "npo", "bpo", "fbo"])

// Turn a stored category slug (e.g. "dft_report") into a readable label ("DFT Report").
function formatCategory(category?: string | null): string {
  if (!category) return "—"
  return category
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) =>
      CATEGORY_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ")
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
      <div className="sm:flex sm:space-x-4 mt-4">
        <Card className="w-full">
          <CardContent>
            <Table className="text-xs w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full">Template Name</TableHead>
                  <TableHead className="text-nowrap">Template type</TableHead>
                  <TableHead className="text-nowrap">Form category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formTemplates.map((formTemplate) => (
                  <TableRow key={formTemplate.id}>
                    <TableCell>
                      <Link href={`/dashboard/form-templates/${formTemplate.id}`}>
                        {formTemplate.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-nowrap">{formTemplate.templateType}</TableCell>
                    <TableCell className="text-nowrap">{formatCategory(formTemplate.formCategory)}</TableCell>
                    <TableCell>
                      <Badge variant={formTemplate.active ? "default" : "secondary"}>
                        {formTemplate.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formTemplate.localDevelopmentAgencyForms.length}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}