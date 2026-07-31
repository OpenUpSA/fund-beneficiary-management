"use client"

import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"
import { sanitizeNumberInput, fieldAllowsNegative } from "@/lib/number-input"

interface DefaultFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function DefaultField({ field, isEditing, onValueChange }: DefaultFieldProps) {
  const isNumber = field.type === "number"
  const allowNegative = fieldAllowsNegative(field.config)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onValueChange) return
    const value = isNumber ? sanitizeNumberInput(e.target.value, allowNegative) : e.target.value
    onValueChange(field, value)
  }

  return (
    <Input
      // Numbers render as text + sanitizer: type="number" lets "-" through
      // regardless of min, and its behaviour varies across browsers
      type={isNumber ? "text" : field.type}
      inputMode={isNumber ? "decimal" : undefined}
      name={field.name}
      disabled={!isEditing}
      value={field.value || ""}
      placeholder={field?.placeholder || ""}
      min={isNumber && !allowNegative ? 0 : field.min}
      max={field.max}
      onChange={handleChange}
    />
  )
}
