"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FieldError, UseFormRegister } from "react-hook-form"

type FormValues = Record<string, string | number | boolean>

interface FormFieldProps {
  field: {
    name: string
    label: string
    type: string
  }
  register: UseFormRegister<FormValues>
  errors: Record<string, FieldError | undefined>
}

export function FormField({ field, register, errors }: FormFieldProps) {
  return (
    <div key={field.name}>
      <label className="block text-sm font-medium">{field.label}</label>
      {(() => {
        const errorClass = errors[field.name] ? "border-red-500" : ""
        
        switch (field.type) {
          case "textarea":
            return (
              <Textarea
                {...register(field.name)}
                className={errorClass}
                rows={8}
              />
            )
          default:
            return (
              <Input
                type={field.type}
                {...register(field.name)}
                className={errorClass}
              />
            )
        }
      })()
      }
      {errors[field.name] && (
        <p className="text-red-500 text-sm">
          {errors[field.name]?.message || "An error occurred"}
        </p>
      )}
    </div>
  )
}
