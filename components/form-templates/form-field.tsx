"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { FieldError, UseFormRegister } from "react-hook-form"


type FormValues = Record<string, string | number | boolean>

interface FormFieldProps {
  field: {
    name: string
    label: string
    type: string
    required?: boolean
    options?: { value: string; label: string }[]
  }
  register: UseFormRegister<FormValues>
  errors: Record<string, FieldError | undefined>
  isEditing?: boolean
}

export function FormField({ field, register, errors, isEditing = false }: FormFieldProps) {
  return (
    <div key={field.name}>
      <label className="block text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {(() => {
        const errorClass = errors[field.name] ? "border-red-500" : ""
        
        switch (field.type) {
          case "textarea":
            return (
              <Textarea
                {...register(field.name)}
                className={errorClass}
                rows={8}
                disabled={!isEditing}
              />
            )
          case "radio":
            return (
              <RadioGroup
                {...register(field.name)}
                className="flex flex-col space-y-1"
                disabled={!isEditing}
              >
                {field.options?.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${field.name}-${option.value}`} />
                    <Label htmlFor={`${field.name}-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )
          default:
            return (
              <Input
                type={field.type}
                {...register(field.name)}
                className={errorClass}
                disabled={!isEditing}
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
