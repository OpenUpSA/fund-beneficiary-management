"use client"

import { Input } from "@/components/ui/input"
import { Field } from "@/types/forms"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Check } from "lucide-react"
import { useState, useMemo, useEffect, useRef } from "react"

interface CaseworkCategoriesLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
  lda_id?: number
  lda_form_id?: number | string
}

interface CaseType {
  name: string
  label: string
}

interface Category {
  name: string
  label: string
  caseTypes: CaseType[]
}

interface Column {
  name: string
  label: string
}

interface FieldValues {
  [key: string]: string
}

export function CaseworkCategoriesLayout({ 
  inputField, 
  isEditing, 
  onValueChange,
}: CaseworkCategoriesLayoutProps) {
  const [fieldValues, setFieldValues] = useState<FieldValues>({})

  // Get config from JSON (must be before hooks that depend on them)
  const categories: Category[] = (inputField.config?.categories as unknown as Category[]) || []
  const columns: Column[] = (inputField.config?.columns as unknown as Column[]) || [
    { name: 'client', label: 'Opened (by client)' },
    { name: 'thirdparty', label: 'Opened (by third party)' }
  ]
  const headerLabel = (inputField.config?.headerLabel as string) || 'New cases opened'
  const statusFieldName = (inputField.config?.statusField as string) || null

  // Generate field key for a specific case type input
  const getFieldKey = (categoryName: string, caseTypeName: string, columnName: string) => {
    return `${inputField.name}_${categoryName}_${caseTypeName}_${columnName}`
  }

  // Get field value by key
  const getFieldValueByKey = (fieldKey: string): string => {
    if (fieldValues[fieldKey]) return fieldValues[fieldKey]
    const existingField = inputField.fields?.find(f => f.name === fieldKey)
    return existingField?.value || ''
  }

  // Get or create a field object for onChange
  const getFieldObject = (categoryName: string, caseTypeName: string, columnName: string): Field => {
    const fieldName = getFieldKey(categoryName, caseTypeName, columnName)
    const existingField = inputField.fields?.find(f => f.name === fieldName)
    if (existingField) return existingField
    
    // Create a virtual field object
    return {
      name: fieldName,
      type: 'number',
      label: '',
      value: fieldValues[fieldName] || '',
      show: true
    }
  }

  // Check if a category row is complete (all columns have values)
  const isRowComplete = (categoryName: string, caseTypeName: string): boolean => {
    return columns.every(col => {
      const fieldKey = getFieldKey(categoryName, caseTypeName, col.name)
      const value = getFieldValueByKey(fieldKey)
      return value !== '' && value !== undefined
    })
  }

  // Check if entire category is complete
  const isCategoryComplete = (category: Category): boolean => {
    return category.caseTypes.every(caseType => isRowComplete(category.name, caseType.name))
  }

  // Calculate totals for each category (dynamic columns)
  const categoryTotals = useMemo(() => {
    const totals: Record<string, { columnTotals: Record<string, number>; total: number }> = {}
    
    categories.forEach(category => {
      const columnTotals: Record<string, number> = {}
      let total = 0
      
      columns.forEach(col => {
        let colSum = 0
        category.caseTypes.forEach(caseType => {
          const key = getFieldKey(category.name, caseType.name, col.name)
          colSum += parseInt(getFieldValueByKey(key) || '0') || 0
        })
        columnTotals[col.name] = colSum
        total += colSum
      })
      
      totals[category.name] = { columnTotals, total }
    })
    
    return totals
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldValues, categories, columns, inputField.fields, inputField.name])

  // Calculate overall completion status
  const isComplete = useMemo(() => {
    return categories.every(category => isCategoryComplete(category))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, fieldValues, inputField.fields, columns, inputField.name])

  // Calculate grand total across all categories
  const grandTotal = useMemo(() => {
    return Object.values(categoryTotals).reduce((sum, cat) => sum + cat.total, 0)
  }, [categoryTotals])

  // Track previous status to avoid unnecessary saves
  const prevStatusRef = useRef<boolean | null>(null)

  // Save status to the status field whenever completion changes
  useEffect(() => {
    if (statusFieldName && onValueChange && prevStatusRef.current !== isComplete) {
      prevStatusRef.current = isComplete
      const statusField: Field = {
        name: statusFieldName,
        type: 'text',
        label: '',
        show: false
      }
      onValueChange(statusField, isComplete ? 'complete' : 'incomplete')
    }
  }, [isComplete, statusFieldName, onValueChange])

  const handleInputChange = (categoryName: string, caseTypeName: string, columnName: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    const fieldKey = getFieldKey(categoryName, caseTypeName, columnName)
    
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: numericValue
    }))
    
    if (onValueChange) {
      const field = getFieldObject(categoryName, caseTypeName, columnName)
      onValueChange(field, numericValue)
    }
  }

  // Only hide if explicitly set to false - moved after all hooks
  if (inputField.show === false) return <></>

  return (
    <div className="space-y-4 p-4 pt-0">
      {/* Grand Total Header */}
      <h3 className="text-lg text-slate-900 flex items-center gap-3">
        <span className="bg-slate-900 text-white min-w-6 h-5 px-1 rounded-full flex items-center justify-center text-xs font-semibold">
          {grandTotal}
        </span>
        <span><span className="font-semibold">{headerLabel}</span> during this reporting period</span>
      </h3>

      {/* Categories */}
      <Accordion type="single" collapsible className="space-y-2">
        {categories.map((category) => {
          const totals = categoryTotals[category.name]
          const isComplete = isCategoryComplete(category)

          return (
            <AccordionItem 
              key={category.name} 
              value={category.name}
              className="border rounded-md bg-white overflow-hidden border-slate-300"
            >
              <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 hover:no-underline transition-colors">
                <div className="flex items-center justify-between flex-1 mr-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-900 text-white min-w-6 h-5 px-1 rounded-full flex items-center justify-center text-xs font-semibold">
                      {totals?.total || 0}
                    </span>
                    <span className="font-semibold text-slate-900">{category.label}</span>
                  </div>
                  {isComplete ? (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                      Complete
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded">
                      Incomplete
                    </span>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="border-t border-slate-200 p-4 pb-4">
                {/* Dynamic Column Headers */}
                <div 
                  className="grid gap-4 mb-3 text-sm text-slate-500"
                  style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${columns.length}, minmax(80px, 1fr)) 32px` }}
                >
                  <div>Case type</div>
                  {columns.map(col => (
                    <div key={col.name}>{col.label}</div>
                  ))}
                  <div></div>
                </div>

                {/* Case Type Rows */}
                {category.caseTypes.map((caseType) => {
                  const rowComplete = isRowComplete(category.name, caseType.name)
                  
                  return (
                    <div 
                      key={caseType.name} 
                      className="grid gap-4 mb-3 items-center"
                      style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${columns.length}, minmax(80px, 1fr)) 32px` }}
                    >
                      <div className="text-sm font-medium text-slate-900">{caseType.label}</div>
                      {columns.map(col => {
                        const fieldKey = getFieldKey(category.name, caseType.name, col.name)
                        return (
                          <div key={col.name}>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={getFieldValueByKey(fieldKey)}
                              onChange={(e) => handleInputChange(category.name, caseType.name, col.name, e.target.value)}
                              disabled={!isEditing}
                              className="h-9 text-slate-700"
                              placeholder="-"
                            />
                          </div>
                        )
                      })}
                      <div className="flex justify-center">
                        {rowComplete && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Category Totals Row */}
                <div 
                  className="grid gap-4 pt-3 border-t border-slate-200 items-center"
                  style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${columns.length}, minmax(80px, 1fr)) 32px` }}
                >
                  <div className="text-sm font-semibold text-slate-900">Total</div>
                  {columns.map(col => (
                    <div key={col.name} className="text-sm font-semibold text-slate-700 px-3 py-2 bg-slate-50 rounded">
                      {totals?.columnTotals[col.name] || 0}
                    </div>
                  ))}
                  <div></div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
