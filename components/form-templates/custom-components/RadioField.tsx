"use client"

import { Field } from "@/types/forms"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface RadioFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function RadioField({ field, isEditing, onValueChange }: RadioFieldProps) {
  return (
    <RadioGroup
      name={field.name}
      className="flex flex-col space-y-1"
      disabled={!isEditing}
      value={field.value}
      onValueChange={(value) => onValueChange && onValueChange(field, value)}
    >
      {field.options?.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <RadioGroupItem value={option.value} id={`${field.name}-${option.value}`} />
          <Label htmlFor={`${field.name}-${option.value}`}>{option.label}</Label>
        </div>
      ))}
    </RadioGroup>
  )
}
