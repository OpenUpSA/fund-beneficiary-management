"use client"

import { useEffect } from "react"
import { DownloadIcon, PrinterIcon } from "lucide-react"
import { Form } from "@/types/forms"
import { buildResponseRows, toCSV } from "@/lib/form-response-export"

interface PreviewData {
  title: string
  ldaName: string
  statusLabel: string
  form: Form
  formData: Record<string, string>
}

function downloadCSV(data: PreviewData) {
  const csv = toCSV(buildResponseRows(data.form, data.formData))
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${data.title.replace(/\s+/g, "_")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  data: PreviewData
}

export function FormPreviewActions({ data }: Props) {
  // ?print=1 (e.g. from the admin Export Responses screen) opens the browser
  // print dialog once the page has rendered, for direct save-as-PDF
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("print")) {
      const timer = setTimeout(() => window.print(), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className="space-y-1">
      <button
        onClick={() => downloadCSV(data)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left"
      >
        <DownloadIcon className="h-4 w-4 text-slate-500 shrink-0" />
        Download spreadsheet
      </button>
      <button
        onClick={() => window.print()}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left"
      >
        <PrinterIcon className="h-4 w-4 text-slate-500 shrink-0" />
        Print / Save as PDF
      </button>
    </div>
  )
}
