"use client"

import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"
import { useState, useEffect } from "react"

interface CurrencyFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function CurrencyField({ field, isEditing, onValueChange }: CurrencyFieldProps) {
  const [displayValue, setDisplayValue] = useState("")
  const isLocked = field.config?.locked === true;
  
  // Initialize display value from field value
  useEffect(() => {
    if (field.value) {
      // Remove any non-numeric characters except decimal point
      const numericValue = field.value.replace(/[^0-9.]/g, '')
      setDisplayValue(numericValue)
    }
  }, [field.value])

  // Format number with commas for display when locked
  const formatCurrency = (value: string) => {
    if (!value) return "0.00";
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  
  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // Allow only numbers and decimal point
    const numericValue = inputValue.replace(/[^0-9.]/g, '')
    
    // Ensure value is not negative
    const parsedValue = parseFloat(numericValue)
    if (!isNaN(parsedValue) && parsedValue >= 0) {
      setDisplayValue(numericValue)
      if (onValueChange) {
        onValueChange(field, numericValue)
      }
    } else if (numericValue === "" || numericValue === ".") {
      setDisplayValue(numericValue)
      if (onValueChange) {
        onValueChange(field, numericValue)
      }
    }
  }

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <span className="text-gray-500">R</span>
      </div>
      <Input
        type="text"
        name={field.name}
        disabled={!isEditing || isLocked}
        value={isLocked ? formatCurrency(displayValue) : displayValue}
        placeholder={field?.placeholder || "0.00"}
        className={`pl-8 ${isLocked ? "pr-10 bg-slate-50 text-slate-700" : ""}`}
        min={0}
        onChange={handleChange}
        inputMode="decimal"
      />
      {isLocked && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Lock className="h-4 w-4 text-slate-400" />
        </div>
      )}
    </div>
  )
}
