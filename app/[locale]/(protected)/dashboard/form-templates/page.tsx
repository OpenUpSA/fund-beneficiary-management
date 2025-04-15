import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"

import { SidebarTrigger } from "@/components/ui/sidebar"

import { fetchFormTemplates } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Link } from "@/i18n/routing"

import { Badge } from "@/components/ui/badge"
import { FormTemplateWithRelations, LocalDevelopmentAgencyFormWithRelations } from "@/types/models"
import { FormDialog } from "@/components/form-templates/form"
import { revalidateTag } from "next/cache"


export async function generateMetadata({ params: { locale }
}: Readonly<{
  params: { locale: string }
}>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FormTemplatePage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

const dataChanged = async () => {
  "use server"
  revalidateTag('form-templates')
}

export default async function Page() {
  const formTemplates: FormTemplateWithRelations[] = await fetchFormTemplates()

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbPage>Form Templates</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Form Templates</h1>
        <div className="space-x-2">
          <FormDialog callback={dataChanged} />
        </div>
      </div>
      <div className="sm:flex sm:space-x-4 mt-4">
        <Card className="w-full">
          <CardContent>
            <Table className="text-xs w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full">Template Name</TableHead>
                  <TableHead>LDAs</TableHead>
                  <TableHead>Description</TableHead>
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
                    <TableCell className="text-nowrap">
                      {formTemplate.localDevelopmentAgencyForms.map((localDevelopmentAgencyForm: LocalDevelopmentAgencyFormWithRelations) => <Badge key={`localDevelopmentAgencyForm-${localDevelopmentAgencyForm.id}`} variant="outline">{localDevelopmentAgencyForm.localDevelopmentAgency.name}</Badge>)}
                    </TableCell>
                    <TableCell className="text-nowrap">{formTemplate.description}</TableCell>
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