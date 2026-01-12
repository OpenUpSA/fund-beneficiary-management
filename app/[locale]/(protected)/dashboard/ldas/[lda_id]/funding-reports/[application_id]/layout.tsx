import { fetchFormTemplates, fetchLocalDevelopmentAgency, fetchLDAForm } from "@/lib/data"
import { revalidateTag } from "next/cache"
import { FormTemplateWithRelations } from "@/types/models"
import { redirect } from "next/navigation"
import { LDA_TERMINOLOGY } from "@/constants/lda"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import LDAFormDetailView from "@/components/lda-forms/form-detail-view"

interface LDAApplicationLayoutProps {
  params: { lda_id: string, application_id: string },
  children: React.ReactNode
}

export default async function Layout({ params, children }: LDAApplicationLayoutProps) {
  const { lda_id, application_id } = params
  
  // Fetch the application data
  const lda = await fetchLocalDevelopmentAgency(lda_id) // Fetch LDA to ensure it exists
  if (!lda) {
    redirect(LDA_TERMINOLOGY.dashboardPath)
  }
  
  const ldaForm = await fetchLDAForm(application_id)
  
  if (!ldaForm) {
    redirect(`${LDA_TERMINOLOGY.dashboardPath}/${lda_id}/funding-reports`)
  }

  const amount = ldaForm.amount ? Number(ldaForm.amount) : 0

  // Find the form template for this application
  const formTemplates: FormTemplateWithRelations[] = await fetchFormTemplates()
  const formTemplate = formTemplates.find(t => t.id === ldaForm.formTemplateId)
  
  if (!formTemplate || !formTemplate.form) {
    redirect(`${LDA_TERMINOLOGY.dashboardPath}/${lda_id}/funding-reports`)
  }

  // Server action for data revalidation
  const dataChanged = async (ldaId?: number, applicationId?: string | number) => {
    "use server"
    if (ldaId) {
      revalidateTag(`lda-forms:lda:${ldaId}:list`)
    }
    if (applicationId) {
      revalidateTag(`lda-forms:detail:${applicationId}`)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`${LDA_TERMINOLOGY.dashboardPath}/${lda_id}/funding-reports`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">
              {formTemplate?.name || "Application"}
            </h1>
          </div>
          {/* <Button variant="outline" size="sm" asChild>
            <Link href={`${LDA_TERMINOLOGY.dashboardPath}/${lda_id}/funding-reports/${application_id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button> */}
        </div>
        
        
        {/* Use the LDAFormDetailView component */}
        <LDAFormDetailView 
          ldaForm={{
            ...ldaForm,
            amount: amount,
            formTemplate: {
              ...formTemplate,
              // Cast the JSON form data to our Form type
              form: formTemplate.form as unknown as import("@/types/forms").Form
            },

            formData: ldaForm.formData as Record<string, string | number | boolean | null | undefined>
          }}
          dataChanged={dataChanged}
        />
      </div>
      {children}
    </>
  )
}