"use client"

import { useState, useCallback } from "react"
import DynamicForm from "@/components/form-templates/dynamicForm"
import { Form } from "@/types/forms"
import { LocalDevelopmentAgencyFormFull } from "@/types/models"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SaveIcon, XIcon } from "lucide-react"

type Props = {
  ldaForm: LocalDevelopmentAgencyFormFull
}

export default function Filler({ ldaForm }: Props) {
  const [formData, setFormData] = useState<Record<string, string>>(ldaForm.formData as Record<string, string>)

  const submitForm = async () => {
    window.dispatchEvent(new Event("submit-dynamic-form"))
  }

  // Re-fetch form data when changes are made
  const dataChanged = useCallback(async () => {
    try {
      const response = await fetch(`/api/lda-form/${ldaForm.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.formData) {
          setFormData(data.formData)
        }
      }
    } catch (error) {
      console.error('Error refreshing form data:', error)
    }
  }, [ldaForm.id])

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
                defaultValues={formData}
                formId={ldaForm.id}
                lda_id={ldaForm.localDevelopmentAgencyId}
                dataChanged={dataChanged}
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
