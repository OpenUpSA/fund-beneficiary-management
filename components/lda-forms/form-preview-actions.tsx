"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"
import { Form, Field } from "@/types/forms"

const SKIP_TYPES = new Set(["info", "data-table"])

interface PreviewData {
  title: string
  ldaName: string
  statusLabel: string
  form: Form
  formData: Record<string, string>
}

function resolveLabel(field: Field, raw: string): string {
  if (field.type === "toggle") return raw === "true" ? "Yes" : raw === "false" ? "No" : raw
  if (field.type === "radio" || field.type === "select") {
    return field.options?.find((o) => o.value === raw)?.label ?? raw
  }
  if (field.type === "multiselect") {
    try {
      const values = JSON.parse(raw) as string[]
      return values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ")
    } catch { return raw }
  }
  return raw
}

function buildCSVRows(data: PreviewData): string[][] {
  const rows: string[][] = [["Section", "Question", "Answer"]]

  for (const section of data.form.sections) {
    for (const field of section.fields) {
      if (SKIP_TYPES.has(field.type)) continue

      if (field.type === "group" && field.fields) {
        for (const sub of field.fields) {
          const raw = data.formData[`${field.name}_${sub.name}`] ?? ""
          rows.push([section.title, `${field.label} – ${sub.label}`, raw])
        }
        continue
      }

      if (field.type === "repeatable" && field.template) {
        const raw = data.formData[field.name] ?? ""
        let indices: number[] = []
        try { indices = JSON.parse(raw) as number[] } catch { /* empty */ }
        for (const idx of indices) {
          for (const tmpl of field.template) {
            const key = `${field.name}_${tmpl.name}_${idx}`
            const val = data.formData[key] ?? ""
            rows.push([section.title, `${field.label} #${idx} – ${tmpl.label}`, val])
          }
        }
        continue
      }

      const raw = data.formData[field.name] ?? ""
      const val = resolveLabel(field, raw)
      rows.push([section.title, field.label, val])
    }
  }

  return rows
}

function downloadCSV(data: PreviewData) {
  const rows = buildCSVRows(data)
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
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
