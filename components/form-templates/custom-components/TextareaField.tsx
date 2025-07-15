"use client"

import { Field } from "@/types/forms"
import { Textarea } from "@/components/ui/textarea"

interface TextareaFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function TextareaField({ field, isEditing, onValueChange }: TextareaFieldProps) {
  return (
    <Textarea
      name={field.name}
      disabled={!isEditing}
      value={field.value || ""}
      className="min-h-[80px] resize-none"
      rows={6}
      placeholder={field?.placeholder || ""}
      onChange={(e) => onValueChange && onValueChange(field, e.target.value)}
    />
  )
}
