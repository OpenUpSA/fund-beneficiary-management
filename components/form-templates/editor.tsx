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
import { Form } from "@/types/forms"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { lintGutter } from "@codemirror/lint"
import { jsonSchema } from "codemirror-json-schema"
import { FORM_TEMPLATE_SCHEMA } from "@/lib/form-template-schema"

// jsonSchema bundles JSON language support, parse + schema linting,
// hover docs, and property/value autocompletion
const editorExtensions = [...jsonSchema(FORM_TEMPLATE_SCHEMA), lintGutter(), EditorView.lineWrapping]

export default function Editor({ formTemplate, allTemplates = [] }: {
  formTemplate: FormTemplate
  allTemplates?: FormTemplate[]
}) {
  const [form, setForm] = useState<Form>()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(formTemplate.form, null, 2))
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
      setPreviewOpen(true)
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
      {jsonError && <div className="text-red-500 mb-2 text-sm">{jsonError}</div>}
      <div className="w-full min-w-0 h-[75vh] overflow-hidden rounded-md border">
        <CodeMirror
          value={jsonText}
          height="75vh"
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
            autocompletion: true,
          }}
        />
      </div>

      {/* Preview modal — content unmounts on close, so every open re-parses
          the latest JSON and renders a fresh form */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview: {form?.title || formTemplate.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {previewOpen && form && <DynamicForm form={form} focusMode />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
