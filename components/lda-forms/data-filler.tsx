"use client"

import DynamicForm from "@/components/form-templates/dynamicForm"
import { Form } from "@/types/forms"
import { LocalDevelopmentAgencyFormFull } from "@/types/models"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SaveIcon, XIcon } from "lucide-react"

type Props = {
  ldaForm: LocalDevelopmentAgencyFormFull,
  callback?: () => Promise<void>
}

export default function Filler({ ldaForm, callback }: Props) {

  const submitForm = async () => {
    window.dispatchEvent(new Event("submit-dynamic-form"))
    if (callback) {
      await callback()
    }
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
