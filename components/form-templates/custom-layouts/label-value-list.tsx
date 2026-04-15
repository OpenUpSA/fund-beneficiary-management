"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"
import { CircleSmall } from "lucide-react"
import { DynamicIcon } from "@/components/form-templates/dynamic-icon"

interface LabelValueListLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function LabelValueListLayout({ 
  inputField, 
  isEditing, 
  onValueChange 
}: LabelValueListLayoutProps) {
  
  const fields = useMemo(() => inputField.fields || [], [inputField.fields])
  const showTotal = inputField.config?.showTotal as boolean
  const totalLabel = (inputField.config?.totalLabel as string) || "Total"

  // Use local state to track field values for controlled inputs
  const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    fields.forEach(field => {
      initial[field.name] = field.value || ""
    })
    return initial
  })

  // Sync local values when fields change from props (e.g., on reload)
  useEffect(() => {
    const newValues: Record<string, string> = {}
    fields.forEach(field => {
      newValues[field.name] = field.value || ""
    })
    setLocalValues(newValues)
  }, [fields])

  const calculateTotal = useCallback((): number => {
    return Object.values(localValues).reduce((sum, val) => {
      const value = parseFloat(val || "0")
      return sum + (isNaN(value) ? 0 : value)
    }, 0)
  }, [localValues])

  const handleFieldChange = (field: Field, value: string) => {
    // Update local state immediately for responsive UI
    setLocalValues(prev => ({ ...prev, [field.name]: value }))
    // Propagate to parent
    if (onValueChange) {
      onValueChange(field, value)
    }
  }
  
  if (!inputField.show) return null

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold leading-5 text-[#0F172A]">{inputField.label}</h3>
        <div className="flex items-center">
          <CircleSmall 
            className="h-4 w-4 mr-1" 
            fill={inputField.isValid ? "#22C55E" : inputField.required ? "#EF4444" : "#CBD5E1"} 
            strokeWidth={0}
          />
          <span className="text-xs text-slate-700">
            {inputField.required ? inputField.isValid ? "Complete" : "Required" : "Optional"}
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 flex-1 flex items-center gap-2">
              {field.icon && (
                <span className="flex items-center justify-center w-8 h-6 rounded-md border border-slate-300">
                  <DynamicIcon name={field.icon} className="w-4 h-4 text-slate-600 bold" />
                </span>
              )}
              {field.label}
            </label>
            <div className="w-40">
              <Input
                type={field.type === "number" ? "number" : "text"}
                value={localValues[field.name] ?? ""}
                placeholder={field.placeholder || "Value"}
                disabled={!isEditing}
                min={field.min}
                max={field.max}
                className="text-right text-slate-900"
                onChange={(e) => handleFieldChange(field, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {showTotal && (
        <>
          <div className="border-t border-slate-200 pt-3 pb-4">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-900">
                {totalLabel}
              </label>
              <div className="w-40">
                <Input
                  type="number"
                  value={calculateTotal()}
                  disabled
                  className="text-right bg-slate-50 font-medium"
                  readOnly
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
