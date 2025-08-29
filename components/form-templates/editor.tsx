"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { FormTemplate } from "@prisma/client"
import DynamicForm from "@/components/form-templates/dynamicForm"
import { EyeIcon, SaveIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { FormDialog } from '@/components/form-templates/form'
import { DeleteDialog } from "@/components/form-templates/delete"
import { Form, FormData } from "@/types/forms"

export default function Editor({ formTemplate }: { 
  formTemplate: FormTemplate
}) {
  const [form, setForm] = useState<Form>()
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(formTemplate.form, null, 2))
  const [data, setData] = useState<FormData>({})
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value)
    setJsonError(null)
  }

  const handlePreviewClick = () => {
    try {
      const parsedForm: Form = JSON.parse(jsonText)
      setForm(parsedForm)
      setJsonError(null)
    } catch (error) {
      console.error("Invalid JSON format:", error)
      setJsonError("Invalid JSON format. Please check your input.")
    }
  }

  const saveCode = async () => {
    toast({
      title: 'Saving form template...',
      variant: 'processing'
    })
    const data = {
      form: JSON.parse(jsonText)
    }
    await fetch(`/api/form-template/${formTemplate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        data
      ),
    })
    toast({
      title: 'Form template saved',
      variant: 'success'
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">{formTemplate.name}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handlePreviewClick}>
            <span className="hidden md:inline">Preview</span>
            <EyeIcon />
          </Button>
          <Button variant="outline" onClick={saveCode}>
            <span className="hidden md:inline">Save</span>
            <SaveIcon />
          </Button>
          <FormDialog formTemplate={formTemplate} />
          <DeleteDialog formTemplate={formTemplate} />
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between space-x-4">
        <textarea
          className="w-full flex-1 bg-black text-green-500 p-4 overflow-auto rounded-md h-[68vh] text-sm resize-none"
          value={jsonText}
          onChange={handleTextareaChange}
        />
        <div className="w-full flex-1 px-6 py-4 text-white bg-black dark:bg-white dark:text-black rounded-md h-[68vh] overflow-y-auto">
          {jsonError && <div className="text-red-500 mt-2">{jsonError}</div>}
          {form && <DynamicForm
            form={form}
            setData={setData}
          />}
        </div>
      </div>
      <div className="w-full bg-black text-green-500 p-10 mt-4 rounded-md">
        <h1>Data:</h1>
        {JSON.stringify(data, null, 2)}
      </div>
    </div>
  )
}
