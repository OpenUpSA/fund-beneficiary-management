"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { FormTemplate } from "@prisma/client"
import DynamicForm from "@/components/form-templates/dynamicForm"
import { EyeIcon, SaveIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"
import { FormDialog } from '@/components/form-templates/form'
import { DeleteDialog } from "@/components/form-templates/delete"
import { ReportScheduleConfigDialog } from "@/components/form-templates/report-schedule-config"
import { Form, FormData } from "@/types/forms"
import CodeMirror from "@uiw/react-codemirror"
import { json, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter } from "@codemirror/lint"

const editorExtensions = [json(), linter(jsonParseLinter()), lintGutter()]

export default function Editor({ formTemplate, allTemplates = [] }: {
  formTemplate: FormTemplate
  allTemplates?: FormTemplate[]
}) {
  const [form, setForm] = useState<Form>()
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(formTemplate.form, null, 2))
  const [data, setData] = useState<FormData>({})
  const [jsonError, setJsonError] = useState<string | null>(null)

  const parseJson = (): Form | null => {
    try {
      const parsed: Form = JSON.parse(jsonText)
      setJsonError(null)
      return parsed
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON format")
      return null
    }
  }

  const handlePreviewClick = () => {
    const parsedForm = parseJson()
    if (parsedForm) {
      setForm(parsedForm)
    } else {
      toast.error("Cannot preview: the template JSON is invalid")
    }
  }

  const handleFormatClick = () => {
    const parsedForm = parseJson()
    if (parsedForm) {
      setJsonText(JSON.stringify(parsedForm, null, 2))
    } else {
      toast.error("Cannot format: the template JSON is invalid")
    }
  }

  const saveCode = async () => {
    const parsedForm = parseJson()
    if (!parsedForm) {
      toast.error("Cannot save: the template JSON is invalid")
      return
    }

    const toastId = toast.loading('Saving form template...')
    const response = await fetch(`/api/form-template/${formTemplate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form: parsedForm }),
    })

    if (response.ok) {
      toast.success('Form template saved', { id: toastId })
    } else {
      toast.error('Failed to save form template', { id: toastId })
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">{formTemplate.name}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleFormatClick}>
            <span className="hidden md:inline">Format</span>
            <WandSparklesIcon />
          </Button>
          <Button variant="outline" onClick={handlePreviewClick}>
            <span className="hidden md:inline">Preview</span>
            <EyeIcon />
          </Button>
          <Button variant="outline" onClick={saveCode}>
            <span className="hidden md:inline">Save</span>
            <SaveIcon />
          </Button>
          <FormDialog formTemplate={formTemplate} allTemplates={allTemplates} />
          {formTemplate.templateType === "APPLICATION" && (
            <ReportScheduleConfigDialog
              applicationTemplate={formTemplate}
              reportTemplates={allTemplates.filter(t => t.templateType === "REPORT")}
            />
          )}
          <DeleteDialog formTemplate={formTemplate} />
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between space-x-4">
        <div className="w-full flex-1 h-[68vh] overflow-hidden rounded-md border">
          <CodeMirror
            value={jsonText}
            height="68vh"
            theme="dark"
            extensions={editorExtensions}
            onChange={(value) => {
              setJsonText(value)
              setJsonError(null)
            }}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              bracketMatching: true,
              autocompletion: false,
            }}
          />
        </div>
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
