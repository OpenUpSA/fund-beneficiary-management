"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { FormTemplateWithRelations } from "@/types/models"
import { CreateTemplateButton } from "@/components/form-templates/form"
import { FilteredFormTemplates } from "@/components/form-templates/filtered"

interface FormTemplatesPanelProps {
  formTemplates: FormTemplateWithRelations[]
  onBack: () => void
}

export function FormTemplatesPanel({ formTemplates, onBack }: FormTemplatesPanelProps) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Tools
      </Button>

      <div className="flex flex-wrap items-center justify-between">
        <h2 className="text-xl font-semibold">Form Templates</h2>
        <CreateTemplateButton allTemplates={formTemplates} />
      </div>
      <FilteredFormTemplates formTemplates={formTemplates} />
    </div>
  )
}
