"use client"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Field } from "@/types/forms"
import { ChevronDown, ChevronUp } from "lucide-react"
import React, { useState, useMemo, useEffect, useRef } from "react"

interface DataGridLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
  lda_id?: number
  lda_form_id?: number | string
}

interface RowConfig {
  name: string
  label: string
}

interface ColumnConfig {
  name: string
  label: string
}

interface CategoryConfig {
  name: string
  label: string
  rows: RowConfig[]
  columns: ColumnConfig[]
  skipToggle?: {
    label: string
    fieldName: string
  }
  validation?: {
    type: 'sum_match' | 'none'
    message?: string
    sourceCategory?: string
  }
}

interface FieldValues {
  [key: string]: string
}

export function DataGridLayout({ 
  inputField, 
  isEditing, 
  onValueChange,
}: DataGridLayoutProps) {
  const [fieldValues, setFieldValues] = useState<FieldValues>({})
  const [skippedCategories, setSkippedCategories] = useState<Record<string, boolean>>({})

  // Only hide if explicitly set to false
  if (inputField.show === false) return <></>

  // Get categories from config
  const categories: CategoryConfig[] = (inputField.config?.categories as unknown as CategoryConfig[]) || []
  const showGrandTotal = inputField.config?.showGrandTotal !== false
  const grandTotalLabel = (inputField.config?.grandTotalLabel as string) || "Total"

  // Initialize expanded state - first category expanded by default
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    if (categories.length > 0) {
      initial[categories[0].name] = true
    }
    return initial
  })

  // Initialize field values from existing fields - only on mount
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    
    const values: FieldValues = {}
    const skipped: Record<string, boolean> = {}
    
    inputField.fields?.forEach(field => {
      if (field.value) {
        values[field.name] = field.value
      }
      // Check for skip toggle fields
      if (field.name.endsWith('_skip') && field.value === 'true') {
        const categoryName = field.name.replace(`${inputField.name}_`, '').replace('_skip', '')
        skipped[categoryName] = true
      }
    })
    setFieldValues(values)
    setSkippedCategories(skipped)
  }, [inputField.fields, inputField.name])

  // Generate field key
  const getFieldKey = (categoryName: string, rowName: string, columnName: string) => {
    return `${inputField.name}_${categoryName}_${rowName}_${columnName}`
  }

  // Get skip toggle field key
  const getSkipFieldKey = (categoryName: string) => {
    return `${inputField.name}_${categoryName}_skip`
  }

  // Get or create a field object for onChange
  const getFieldObject = (fieldName: string): Field => {
    const existingField = inputField.fields?.find(f => f.name === fieldName)
    if (existingField) return existingField
    
    return {
      name: fieldName,
      type: 'number',
      label: '',
      value: fieldValues[fieldName] || '',
      show: true
    }
  }

  // Get field value by key
  const getFieldValue = (categoryName: string, rowName: string, columnName: string): string => {
    const fieldKey = getFieldKey(categoryName, rowName, columnName)
    if (fieldValues[fieldKey]) return fieldValues[fieldKey]
    const existingField = inputField.fields?.find(f => f.name === fieldKey)
    return existingField?.value || ''
  }

  // Calculate totals for each category
  const categoryTotals = useMemo(() => {
    const totals: Record<string, { columnTotals: Record<string, number>; grandTotal: number }> = {}
    
    categories.forEach(category => {
      const columnTotals: Record<string, number> = {}
      let grandTotal = 0
      
      category.columns.forEach(column => {
        let columnSum = 0
        category.rows.forEach(row => {
          const value = parseInt(getFieldValue(category.name, row.name, column.name) || '0') || 0
          columnSum += value
        })
        columnTotals[column.name] = columnSum
        grandTotal += columnSum
      })
      
      totals[category.name] = { columnTotals, grandTotal }
    })
    
    return totals
  }, [fieldValues, categories, inputField.fields])

  // Calculate overall grand total
  const overallGrandTotal = useMemo(() => {
    return Object.values(categoryTotals).reduce((sum, cat) => sum + cat.grandTotal, 0)
  }, [categoryTotals])

  // Validation check
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    
    categories.forEach(category => {
      if (category.validation?.type === 'sum_match' && category.validation.sourceCategory) {
        const sourceTotal = categoryTotals[category.validation.sourceCategory]?.grandTotal || 0
        const currentTotal = categoryTotals[category.name]?.grandTotal || 0
        
        if (currentTotal > sourceTotal) {
          errors[category.name] = category.validation.message || 'Total exceeds allowed amount'
        }
      }
    })
    
    return errors
  }, [categoryTotals, categories])

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      // If clicking on already expanded category, close it
      if (prev[categoryName]) {
        return {}
      }
      // Otherwise, open only this category (close all others)
      return { [categoryName]: true }
    })
  }

  const handleSkipToggle = (categoryName: string, checked: boolean) => {
    setSkippedCategories(prev => ({
      ...prev,
      [categoryName]: checked
    }))
    
    // Save skip state
    if (onValueChange) {
      const field = getFieldObject(getSkipFieldKey(categoryName))
      onValueChange(field, checked ? 'true' : 'false')
    }
  }

  const handleInputChange = (categoryName: string, rowName: string, columnName: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    const fieldKey = getFieldKey(categoryName, rowName, columnName)
    
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: numericValue
    }))
    
    if (onValueChange) {
      const field = getFieldObject(fieldKey)
      onValueChange(field, numericValue)
    }
  }

  // Calculate grid columns based on max columns in any category
  const getGridCols = (columnCount: number) => {
    return `grid-cols-${columnCount + 1}` // +1 for row label column
  }

  return (
    <div className="space-y-4">
      {/* Grand Total Header */}
      {showGrandTotal && (
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-bold">
            {overallGrandTotal}
          </span>
          <span>{grandTotalLabel}</span>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {categories.map((category) => {
          const isExpanded = expandedCategories[category.name]
          const totals = categoryTotals[category.name]
          const isSkipped = skippedCategories[category.name]
          const hasError = validationErrors[category.name]
          const columnCount = category.columns.length

          return (
            <div key={category.name} className="border rounded-lg bg-white overflow-hidden">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-sm font-bold">
                    {totals?.grandTotal || 0}
                  </span>
                  <span className="font-medium">{category.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {/* Category Content */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-4">
                  {/* Skip Toggle */}
                  {category.skipToggle && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                      <Switch
                        checked={isSkipped}
                        onCheckedChange={(checked) => handleSkipToggle(category.name, checked)}
                        disabled={!isEditing}
                      />
                      <span className="text-sm text-slate-600">{category.skipToggle.label}</span>
                    </div>
                  )}

                  {/* Data Grid */}
                  {!isSkipped && (
                    <>
                      {/* Column Headers */}
                      <div 
                        className="grid gap-4 mb-3 text-sm text-slate-500"
                        style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${columnCount}, minmax(100px, 1fr))` }}
                      >
                        <div>Case type</div>
                        {category.columns.map(col => (
                          <div key={col.name}>{col.label}</div>
                        ))}
                      </div>

                      {/* Data Rows */}
                      {category.rows.map((row) => (
                        <div 
                          key={row.name} 
                          className="grid gap-4 mb-3 items-center"
                          style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${columnCount}, minmax(100px, 1fr))` }}
                        >
                          <div className="text-sm font-medium">{row.label}</div>
                          {category.columns.map(col => (
                            <div key={col.name}>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={getFieldValue(category.name, row.name, col.name)}
                                onChange={(e) => handleInputChange(category.name, row.name, col.name, e.target.value)}
                                disabled={!isEditing}
                                className="h-9"
                                placeholder="0"
                              />
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Totals Row */}
                      <div 
                        className="grid gap-4 pt-3 border-t border-slate-200 items-center"
                        style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${columnCount}, minmax(100px, 1fr))` }}
                      >
                        <div className="text-sm font-semibold">Total</div>
                        {category.columns.map(col => (
                          <div key={col.name} className="text-sm font-semibold text-slate-600 px-3 py-2 bg-slate-50 rounded">
                            {totals?.columnTotals[col.name] || 0}
                          </div>
                        ))}
                      </div>

                      {/* Validation Error */}
                      {hasError && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                          {hasError}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
