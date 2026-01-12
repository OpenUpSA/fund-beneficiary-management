import { getTranslations } from "next-intl/server"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { fetchFormTemplates, fetchLDAForm } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { FormDialog } from "@/components/lda-forms/form"
import { DeleteDialog } from "@/components/lda-forms/delete"
import { FormTemplateWithRelations, LocalDevelopmentAgencyFormFull } from "@/types/models"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import LDAFormDataView from "@/components/lda-forms/data-view"
import { Form } from "@/types/forms"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"
import { NotebookPenIcon } from "lucide-react"
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface FormTemplatePageProps {
  params: { lda_form_id: string, locale: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

interface BreadcrumbLink {
  label: string;
  href?: string;
  isCurrent?: boolean;
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

const dataChanged = async (ldaId?: number) => {
  "use server"
  if (ldaId) {
    revalidateTag(`ldas:details:${ldaId}`)
    revalidateTag(`lda-forms:lda:${ldaId}:list`)
  } else {
    revalidateTag('ldas:list')
    revalidateTag('lda-forms:list')
  }
}

export default async function Page({ params, searchParams }: FormTemplatePageProps) {
  const { lda_form_id } = params
  const { from } = searchParams
  const ldaForm: LocalDevelopmentAgencyFormFull = await fetchLDAForm(lda_form_id)
  const formTemplates: FormTemplateWithRelations[] = await fetchFormTemplates()

  let breadcrumbLinks: BreadcrumbLink[] = [
    { label: "Applications & Reports", href: "/dashboard/applications-reports" },
    { label: ldaForm.title, isCurrent: true }
  ]

  if (from && typeof from === 'string') {
    if (from === "lda") {
      if (ldaForm?.localDevelopmentAgency?.id) {
        breadcrumbLinks = [{
          label: ldaForm?.localDevelopmentAgency.name,
          href: `/dashboard/ldas/${ldaForm?.localDevelopmentAgency.id}`
        }, ...breadcrumbLinks]
      }
    }
  }

  return (
    <div>
      <BreadcrumbNav
        className="mb-4"
        links={breadcrumbLinks}
      />
      <div>
        <div className="flex flex-wrap items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-semibold">{ldaForm.title}</h1>
          <div className="space-x-2">
            <Button asChild>
              <Link href={`/dashboard/applications-reports/${ldaForm.id}/fill/`}>
                <span className="hidden md:inline">Fill</span>
                <NotebookPenIcon />
              </Link>
            </Button>
            <FormDialog
              formTemplates={formTemplates}
              ldaForm={ldaForm}
              callback={dataChanged} />
            <DeleteDialog
              ldaForm={ldaForm}
              callback={dataChanged} />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="sm:flex gap-4">
          <Card className="w-full sm:w-[40%]">
            <CardContent className="pt-2 space-y-2 text-sm py-4">
              <div className="flex justify-between">
                <span className="font-medium">Form Template:</span>
                <span>{ldaForm.formTemplate.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium"><abbr title={LDA_TERMINOLOGY.fullName}>{LDA_TERMINOLOGY.shortName}</abbr>:</span>
                <span>{ldaForm.localDevelopmentAgency.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Form Status:</span>
                <span>{ldaForm.formStatus.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Submitted:</span>
                <span>{ldaForm.submitted ? format(ldaForm.submitted, 'PPpp') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Due:</span>
                <span>{ldaForm.dueDate ? format(ldaForm.dueDate, 'PPpp') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Approved:</span>
                <span>{ldaForm.approved ? format(ldaForm.approved, 'PPpp') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Created At:</span>
                <span>{format(ldaForm.createdAt, 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Updated At:</span>
                <span>{format(ldaForm.updatedAt, 'PPpp')}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardContent className="p-5">
              {ldaForm.formTemplate.form && <LDAFormDataView
                data={ldaForm.formData as Record<string, string>}
                form={ldaForm.formTemplate.form as unknown as Form} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
