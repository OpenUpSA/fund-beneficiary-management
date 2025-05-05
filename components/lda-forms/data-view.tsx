import { Form } from "@/types/forms"
import React from "react"

type Props = {
  data: Record<string, string>
  form: Form
}

export default function LDAFormDataView({ data, form }: Props) {
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">{form.title}</h1>
      {form.sections.map((section, i) => (
        <div key={i} className="space-y-4">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.fields.map((field) => (
            <div key={field.name}>
              <label className="font-medium">{field.label}</label>
              <div className="border p-2 bg-gray-100 rounded">
                {data[field.name] || <span className="text-gray-500 italic">Not provided</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
