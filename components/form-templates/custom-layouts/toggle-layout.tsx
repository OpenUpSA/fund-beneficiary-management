"use client"

import { Field } from "@/types/forms"
import { Switch } from "@/components/ui/switch"


interface ToggleLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function ToggleLayout({ inputField, isEditing, onValueChange }: ToggleLayoutProps) {
  if (!inputField.show) return null

  return (
    <div className="flex items-center justify-between px-4">
      <div className="flex items-center space-x-3 w-full p-4 bg-slate-50 rounded-lg">
        <Switch
          id={inputField.name}
          checked={inputField.value === "true"}
          disabled={!isEditing}
          onCheckedChange={(checked) => onValueChange && onValueChange(inputField, String(checked))}
        />
        <label 
          htmlFor={inputField.name} 
          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          {inputField.label}
        </label>
      </div>
    </div>
  )
}
