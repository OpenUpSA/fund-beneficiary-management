"use client"

import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface CurrencyFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function CurrencyField({ field, isEditing, onValueChange }: CurrencyFieldProps) {
  const [displayValue, setDisplayValue] = useState("")
  
  // Initialize display value from field value
  useEffect(() => {
    if (field.value) {
      // Remove any non-numeric characters except decimal point
      const numericValue = field.value.replace(/[^0-9.]/g, '')
      setDisplayValue(numericValue)
    }
  }, [field.value])
  
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
        disabled={!isEditing}
        value={displayValue}
        placeholder={field?.placeholder || "0.00"}
        className="pl-8"
        min={0}
        onChange={handleChange}
        inputMode="decimal"
      />
    </div>
  )
}
