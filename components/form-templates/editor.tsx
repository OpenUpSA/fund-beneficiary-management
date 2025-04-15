"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { FormTemplate } from "@prisma/client"
import DynamicForm from "@/components/form-templates/dynamicForm"

type FieldType = "string" | "number" | "textarea" | "email";

interface Field {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  min?: number;
}

interface Section {
  title: string;
  fields: Field[];
}

interface Form {
  title: string;
  sections: Section[];
}

export default function Editor({ formTemplate }: { formTemplate: FormTemplate }) {
  const [form, setForm] = useState<Form>()
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(formTemplate.form, null, 2))
  const [data, setData] = useState<Record<string, string>>({})
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between space-x-4">
        <textarea
          className="w-full flex-1 bg-black light:bg-white text-white p-4 overflow-auto rounded-md h-[75vh] text-sm"
          value={jsonText}
          onChange={handleTextareaChange}
        />
        <Button onClick={handlePreviewClick}>
          Preview
        </Button>
        {jsonError && <div className="text-red-500 mt-2">{jsonError}</div>}  {/* Show error message if there's an issue with JSON */}
        <div className="w-full flex-1 p-10 text-white bg-black dark:bg-white dark:text-black rounded-md h-[75vh] overflow-y-auto">
          <h1>Form Template Preview</h1>
          {form && <DynamicForm
            form={form}
            callback={setData}
          />}
        </div>
      </div>
      <div className="w-full bg-black text-green-500 p-10 mt-10 rounded-md">
        <h1>Data:</h1>
        {JSON.stringify(data, null, 2)}
      </div>
    </div>
  )
}
