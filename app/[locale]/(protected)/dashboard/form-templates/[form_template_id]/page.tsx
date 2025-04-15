import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { fetchFormTemplate } from "@/lib/data"
import Editor from "@/components/form-templates/editor"

interface FormTemplatePageProps {
  params: { form_template_id: string }
}

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FormTemplatePage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
  }
}

export default async function Page({ params }: FormTemplatePageProps) {
  const { form_template_id } = params
  const formTemplate = await fetchFormTemplate(form_template_id)

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbLink href="/dashboard/form-templates">Form Templates</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{formTemplate.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Editor formTemplate={formTemplate} />
    </div>
  )
}
