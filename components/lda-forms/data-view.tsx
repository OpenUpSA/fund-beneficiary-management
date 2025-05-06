import { Form } from "@/types/forms"
import React from "react"
import { Card, CardContent, CardHeader } from "../ui/card"

type Props = {
  data: Record<string, string>
  form: Form
}

export default function LDAFormDataView({ data, form }: Props) {
  return (
    <div className="space-y-6 p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{form.title}</h1>

      {form.sections.map((section, sectionIndex) => (
        <Card key={sectionIndex} className="p-4">
          <CardHeader className="text-lg font-semibold">{section.title}</CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  {field.label}
                </label>
                <div className="border p-3 rounded bg-gray-50 dark:bg-black text-sm">
                  {data[field.name] || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
