"use client"

import { Field } from "@/types/forms"

interface InfoFieldProps {
  field: Field
}

export function InfoField({ field }: InfoFieldProps) {
  // Use the field's notice or description as the content (expects HTML)
  const content = field.notice || field.description || field.label || ""

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
      <p 
        className="text-sm text-slate-500 m-0 leading-relaxed [&>strong]:font-bold [&>a]:text-slate-500 [&>a]:underline"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}
