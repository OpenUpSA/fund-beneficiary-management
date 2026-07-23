"use client"

import { Field } from "@/types/forms"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"

// Option lists longer than this get a searchable combobox instead of a plain select
const SEARCHABLE_OPTIONS_THRESHOLD = 10

interface SelectFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function SelectField({ field, isEditing, onValueChange }: SelectFieldProps) {
  const options = field.options ?? []

  if (options.length > SEARCHABLE_OPTIONS_THRESHOLD) {
    return (
      <Combobox
        options={options.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={field.value?.toString() || ""}
        onChange={(value) => onValueChange && onValueChange(field, value)}
        placeholder={field?.placeholder || "Select an option"}
        disabled={!isEditing}
      />
    )
  }

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
        {options.map((option) => (
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
