"use client"

import { Field } from "@/types/forms"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ToggleFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function ToggleField({ field, isEditing, onValueChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center space-x-3">
      <Switch
        id={field.name}
        checked={field.value === "true"}
        disabled={!isEditing}
        onCheckedChange={(checked) => onValueChange && onValueChange(field, String(checked))}
      />
      <Label htmlFor={field.name} className="text-sm font-normal">
        {field.label}
      </Label>
    </div>
  )
}
