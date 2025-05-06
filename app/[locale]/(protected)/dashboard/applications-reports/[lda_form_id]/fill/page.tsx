import { getTranslations } from "next-intl/server"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { fetchLDAForm } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { LocalDevelopmentAgencyFormFull } from "@/types/models"
import Filler from "@/components/lda-forms/data-filler"

interface FormTemplatePageProps {
  params: { lda_form_id: string }
}

export async function generateMetadata({ params: { locale } }: Readonly<{ params: { locale: string } }>) {
  const tM = await getTranslations({ locale, namespace: 'metadata' })
  const t = await getTranslations({ locale, namespace: 'FormTemplatePage' })

  return {
    title: `${t('page title')} - ${tM('title')}`,
    description: tM('description')
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
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
            <BreadcrumbLink href="/dashboard/applications-reports">Applications &amp; Reports</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/dashboard/applications-reports/${ldaForm.id}/`}>{ldaForm.title}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Fill</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Filler
        ldaForm={ldaForm}
        callback={dataChanged} />
    </div>
  )
}
