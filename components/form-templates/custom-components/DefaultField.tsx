"use client"

import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"

interface DefaultFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function DefaultField({ field, isEditing, onValueChange }: DefaultFieldProps) {
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
