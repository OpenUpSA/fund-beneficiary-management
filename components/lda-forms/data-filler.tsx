"use client"

import DynamicForm from "@/components/form-templates/dynamicForm"
import { Form, FormData } from "@/types/forms"
import { LocalDevelopmentAgencyFormFull } from "@/types/models"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SaveIcon, XIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { JsonValue } from "@prisma/client/runtime/library"
import { useRouter } from "next/navigation"

type Props = {
  ldaForm: LocalDevelopmentAgencyFormFull,
  callback: () => void
}

export default function Filler({ ldaForm, callback }: Props) {
  const router = useRouter()

  const submitForm = () => {
    window.dispatchEvent(new Event("submit-dynamic-form"))
  }

  const saveData = async (data: FormData) => {
    toast({
      title: 'Saving form...',
      variant: 'processing'
    })
    const updatedFormData: { formData: JsonValue } = { formData: data as unknown as JsonValue }
    await fetch(`/api/lda-form/${ldaForm.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFormData),
    })
    toast({
      title: 'Form saved',
      variant: 'success'
    })
    callback()
    router.push(`/dashboard/applications-reports/${ldaForm.id}/`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div>
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div></div>
          <div className="space-x-2">
            <Button onClick={submitForm}>
              <span className="hidden md:inline">Save</span>
              <SaveIcon />
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="sm:flex gap-4">
          <Card className="w-full">
            <CardContent className="p-5">
              {ldaForm.formTemplate.form && <DynamicForm
                form={ldaForm.formTemplate.form as unknown as Form}
                defaultValues={ldaForm.formData as Record<string, string>}
                saveData={saveData}
              />}
            </CardContent>
          </Card>
        </div>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between mt-4">
          <div>
            <Button asChild variant="destructive">
              <Link href={`/dashboard/applications-reports/${ldaForm.id}/`}>
                <span className="hidden md:inline">Cancel</span>
                <XIcon />
              </Link>
            </Button>
          </div>
          <div className="space-x-2">
            <Button onClick={submitForm}>
              <span className="hidden md:inline">Save</span>
              <SaveIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
