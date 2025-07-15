"use client"

import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"

interface TextFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function TextField({ field, isEditing, onValueChange }: TextFieldProps) {
  return (
    <Input
      type={field.type}
      name={field.name}
      disabled={!isEditing}
      value={field.value || ""}
      placeholder={field?.placeholder || ""}
      onChange={(e) => onValueChange && onValueChange(field, e.target.value)}
    />
  )
}
