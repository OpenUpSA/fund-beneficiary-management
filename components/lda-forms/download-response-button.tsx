"use client"

import { DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form } from "@/types/forms"
import { buildResponseRows, toCSV, FormData } from "@/lib/form-response-export"

interface Props {
  title: string
  form: Form
  formData: FormData
}

export function DownloadResponseButton({ title, form, formData }: Props) {
  const handleDownload = () => {
    const csv = toCSV(buildResponseRows(form, formData))
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.replace(/\s+/g, "_")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={handleDownload}>
      <span className="hidden md:inline">Download Response</span>
      <DownloadIcon />
    </Button>
  )
}
