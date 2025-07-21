"use client"

import { Field } from "@/types/forms"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SelectFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function SelectField({ field, isEditing, onValueChange }: SelectFieldProps) {
  return (
    <Select
      name={field.name}
      disabled={!isEditing}
      value={field.value?.toString() || ""}
      onValueChange={(value) => onValueChange && onValueChange(field, value)}
    >
      <SelectTrigger>
        <SelectValue placeholder={field?.placeholder || "Select an option"} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
