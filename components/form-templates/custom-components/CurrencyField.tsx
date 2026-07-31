"use client"

import { Field } from "@/types/forms"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"
import { useState, useEffect } from "react"
import { normalizeCurrencyInput, parseCurrency, formatCurrencyValue } from "@/lib/currency"

interface CurrencyFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function CurrencyField({ field, isEditing, onValueChange }: CurrencyFieldProps) {
  const [displayValue, setDisplayValue] = useState("")
  const isLocked = field.config?.locked === true;
  
  // Initialize display value from field value (stored data may still contain
  // comma decimals from before normalization existed)
  useEffect(() => {
    if (field.value) {
      setDisplayValue(normalizeCurrencyInput(field.value))
    }
  }, [field.value])

  // Non-editing/locked fields show the formatted amount: space thousands
  // separator, "." decimal (e.g. "12 345.67")
  const formatCurrency = (value: string) => {
    if (!value) return isLocked ? "0.00" : "";
    return formatCurrencyValue(parseCurrency(value), { minFractionDigits: 0 });
  }

  // Handle value change: accept "," or "." as the decimal separator and
  // store the canonical "1234.56" form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = normalizeCurrencyInput(e.target.value)

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
        value={isLocked || !isEditing ? formatCurrency(displayValue) : displayValue}
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
