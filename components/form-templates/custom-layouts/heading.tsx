"use client"

import { Field } from "@/types/forms"

interface HeadingLayoutProps {
  inputField: Field
}

export function HeadingLayout({ inputField }: HeadingLayoutProps) {
  if (!inputField.show) return null

  return (
    <div className="pt-4 pb-2">
      <h3 className="text-base font-semibold text-slate-900 px-4 text-lg">
        {inputField.label}
      </h3>
      {inputField.description && (
        <p className="text-sm text-slate-500 mt-1">{inputField.description}</p>
      )}
    </div>
  )
}
