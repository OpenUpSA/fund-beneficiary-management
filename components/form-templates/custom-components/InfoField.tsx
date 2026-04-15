"use client"

import { Field } from "@/types/forms"

interface InfoFieldProps {
  field: Field
}

export function InfoField({ field }: InfoFieldProps) {
  // Use the field's notice or description as the content (expects HTML)
  const content = field.notice || field.description || ""

  return (
    <>
    {field.label && <label className="block text-sm font-medium text-slate-900 dark:text-gray-300">
      {field.label}
    </label>}
    {content && <div className="p-3 bg-slate-100 text-slate-500 rounded-md mt-2">
      <p 
        className="text-sm text-slate-500 m-0 leading-relaxed [&>strong]:font-bold [&>a]:text-slate-500 [&>a]:underline"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>}
    </>
  )
}
