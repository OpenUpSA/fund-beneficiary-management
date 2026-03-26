"use client"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/types/forms"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Check } from "lucide-react"
import { useState, useMemo, useEffect, useRef } from "react"

interface FinalisedCasesLayoutProps {
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

interface DemographicConfig {
  name: string
  label: string
  skipLabel?: string
  columns: Column[]
}

interface CasesColumnsConfig {
  name: string
  label: string
}

interface FieldValues {
  [key: string]: string
}

export function FinalisedCasesLayout({ 
  inputField, 
  isEditing, 
  onValueChange,
}: FinalisedCasesLayoutProps) {
  const [fieldValues, setFieldValues] = useState<FieldValues>({})
  const [skippedDemographics, setSkippedDemographics] = useState<Record<string, boolean>>({})

  // Get config from JSON - memoize to prevent dependency issues
  const categories: Category[] = useMemo(() => 
    (inputField.config?.categories as unknown as Category[]) || [],
    [inputField.config?.categories]
  )
  const casesColumns: CasesColumnsConfig[] = useMemo(() => 
    (inputField.config?.casesColumns as unknown as CasesColumnsConfig[]) || [
      { name: 'referred', label: 'Referred' },
      { name: 'closed', label: 'Closed' }
    ],
    [inputField.config?.casesColumns]
  )
  const demographics: DemographicConfig[] = useMemo(() => 
    (inputField.config?.demographics as unknown as DemographicConfig[]) || [],
    [inputField.config?.demographics]
  )
  const casesLabel = (inputField.config?.casesLabel as string) || 'Cases finalised during this reporting period'
  const casesNotice = (inputField.config?.casesNotice as string) || ''
  const statusFieldName = (inputField.config?.statusField as string) || null

  // Field key generators
  const getCasesFieldKey = (categoryName: string, caseTypeName: string, columnName: string) => {
    return `${inputField.name}_cases_${categoryName}_${caseTypeName}_${columnName}`
  }

  const getDemographicFieldKey = (demographic: string, categoryName: string, caseTypeName: string, columnName: string) => {
    return `${inputField.name}_${demographic}_${categoryName}_${caseTypeName}_${columnName}`
  }

  const getSkipFieldKey = (demographic: string, categoryName: string) => {
    return `${inputField.name}_${demographic}_${categoryName}_skip`
  }

  const getSkipReasonFieldKey = (demographic: string, categoryName: string) => {
    return `${inputField.name}_${demographic}_${categoryName}_skip_reason`
  }

  // Get field value
  const getFieldValue = (fieldKey: string): string => {
    if (fieldValues[fieldKey]) return fieldValues[fieldKey]
    const existingField = inputField.fields?.find(f => f.name === fieldKey)
    return existingField?.value || ''
  }

  // Get field object for onChange
  const getFieldObject = (fieldName: string): Field => {
    const existingField = inputField.fields?.find(f => f.name === fieldName)
    if (existingField) return existingField
    return {
      name: fieldName,
      type: 'text',
      label: '',
      value: fieldValues[fieldName] || '',
      show: true
    }
  }

  // Check if demographic is skipped
  const isSkipped = (demographic: string, categoryName: string): boolean => {
    const skipKey = `${demographic}_${categoryName}`
    if (skippedDemographics[skipKey] !== undefined) return skippedDemographics[skipKey]
    const fieldKey = getSkipFieldKey(demographic, categoryName)
    return getFieldValue(fieldKey) === 'true'
  }

  // Get skip reason
  const getSkipReason = (demographic: string, categoryName: string): string => {
    const fieldKey = getSkipReasonFieldKey(demographic, categoryName)
    return getFieldValue(fieldKey)
  }

  // Calculate totals for cases (dynamic columns)
  const caseTotals = useMemo(() => {
    const totals: Record<string, { columnTotals: Record<string, number>; total: number }> = {}
    
    categories.forEach(category => {
      const columnTotals: Record<string, number> = {}
      let total = 0
      
      casesColumns.forEach(col => {
        let colSum = 0
        category.caseTypes.forEach(caseType => {
          const key = `${inputField.name}_cases_${category.name}_${caseType.name}_${col.name}`
          const fieldValue = fieldValues[key] || inputField.fields?.find(f => f.name === key)?.value || ''
          colSum += parseInt(fieldValue || '0') || 0
        })
        columnTotals[col.name] = colSum
        total += colSum
      })
      
      totals[category.name] = { columnTotals, total }
    })
    
    return totals
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldValues, categories, casesColumns, inputField.fields, inputField.name])

  // Categories with cases (total > 0)
  const categoriesWithCases = useMemo(() => {
    return categories.filter(cat => (caseTotals[cat.name]?.total || 0) > 0)
  }, [categories, caseTotals])

  // Calculate demographic totals per category
  const getDemographicTotals = (demographic: string, categoryName: string) => {
    const category = categories.find(c => c.name === categoryName)
    if (!category) return { columnTotals: {}, grandTotal: 0 }
    
    const demo = demographics.find(d => d.name === demographic)
    if (!demo) return { columnTotals: {}, grandTotal: 0 }
    
    const columnTotals: Record<string, number> = {}
    let grandTotal = 0
    
    demo.columns.forEach(col => {
      let colSum = 0
      category.caseTypes.forEach(caseType => {
        const key = getDemographicFieldKey(demographic, categoryName, caseType.name, col.name)
        colSum += parseInt(getFieldValue(key) || '0') || 0
      })
      columnTotals[col.name] = colSum
      grandTotal += colSum
    })
    
    return { columnTotals, grandTotal }
  }

  // Check if a case row is complete (all columns have values)
  const isCaseRowComplete = (categoryName: string, caseTypeName: string): boolean => {
    return casesColumns.every(col => {
      const fieldKey = getCasesFieldKey(categoryName, caseTypeName, col.name)
      const value = getFieldValue(fieldKey)
      return value !== '' && value !== undefined
    })
  }

  // Check if entire category is complete
  const isCategoryComplete = (category: Category): boolean => {
    return category.caseTypes.every(caseType => isCaseRowComplete(category.name, caseType.name))
  }

  // Check if a demographic row is complete
  const isDemoRowComplete = (demographic: string, categoryName: string, caseTypeName: string, columns: Column[]): boolean => {
    return columns.every(col => {
      const fieldKey = getDemographicFieldKey(demographic, categoryName, caseTypeName, col.name)
      const value = getFieldValue(fieldKey)
      return value !== '' && value !== undefined
    })
  }

  // Check if demographic category is complete
  const isDemoCategoryComplete = (demographic: DemographicConfig, category: Category): boolean => {
    const skipActive = isSkipped(demographic.name, category.name)
    if (skipActive) {
      const reason = getSkipReason(demographic.name, category.name)
      return reason !== '' && reason !== undefined
    }
    return category.caseTypes.every(caseType => 
      isDemoRowComplete(demographic.name, category.name, caseType.name, demographic.columns)
    )
  }

  // Calculate overall completion status
  const isComplete = useMemo(() => {
    // Check cases section
    const casesComplete = categories.every(category => isCategoryComplete(category))
    if (!casesComplete) return false
    
    // Check demographics sections
    for (const demographic of demographics) {
      for (const category of categoriesWithCases) {
        if (!isDemoCategoryComplete(demographic, category)) {
          return false
        }
      }
    }
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, demographics, categoriesWithCases, fieldValues, skippedDemographics, inputField.fields])

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

  // Input change handler
  const handleInputChange = (fieldKey: string, value: string, isNumeric: boolean = true) => {
    const finalValue = isNumeric ? value.replace(/[^0-9]/g, '') : value
    
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: finalValue
    }))
    
    if (onValueChange) {
      const field = getFieldObject(fieldKey)
      onValueChange(field, finalValue)
    }
  }

  // Skip toggle handler
  const handleSkipToggle = (demographic: string, categoryName: string, checked: boolean) => {
    const skipKey = `${demographic}_${categoryName}`
    setSkippedDemographics(prev => ({
      ...prev,
      [skipKey]: checked
    }))
    
    const fieldKey = getSkipFieldKey(demographic, categoryName)
    handleInputChange(fieldKey, checked ? 'true' : 'false', false)
  }

  // Early return moved after all hooks
  if (inputField.show === false) return <></>

  return (
    <div className="space-y-2 p-4">
      {/* SECTION 1: Cases Finalised */}
      <div className="space-y-2">
        <h3 className="text-lg text-slate-900">
          <span className="font-semibold">{casesLabel}</span> during this reporting period
        </h3>

        {casesNotice && (
          <div className="bg-slate-100 p-3 rounded w-full text-slate-500">
            <strong>Please note!</strong> {casesNotice}
          </div>
        )}

        <Accordion type="single" collapsible className="space-y-2">
          {categories.map((category) => {
            const totals = caseTotals[category.name]
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
                      <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
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
                    style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${casesColumns.length}, minmax(80px, 1fr)) 32px` }}
                  >
                    <div>Case type</div>
                    {casesColumns.map(col => (
                      <div key={col.name}>{col.label}</div>
                    ))}
                    <div></div>
                  </div>

                  {/* Case Type Rows */}
                  {category.caseTypes.map((caseType) => {
                    const rowComplete = isCaseRowComplete(category.name, caseType.name)
                    
                    return (
                      <div 
                        key={caseType.name} 
                        className="grid gap-4 mb-3 items-center"
                        style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${casesColumns.length}, minmax(80px, 1fr)) 32px` }}
                      >
                        <div className="text-sm font-medium text-slate-900">{caseType.label}</div>
                        {casesColumns.map(col => {
                          const fieldKey = getCasesFieldKey(category.name, caseType.name, col.name)
                          return (
                            <div key={col.name}>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={getFieldValue(fieldKey)}
                                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
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

                  {/* Totals Row */}
                  <div 
                    className="grid gap-4 pt-3 border-t border-slate-200 items-center"
                    style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${casesColumns.length}, minmax(80px, 1fr)) 32px` }}
                  >
                    <div className="text-sm font-semibold text-slate-900">Total</div>
                    {casesColumns.map(col => (
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

      {/* DEMOGRAPHICS SECTIONS */}
      {demographics.map((demographic) => (
        <div key={demographic.name} className="space-y-2">
          <h3 className="text-lg text-slate-900">
            <span className="font-semibold">{demographic.label}</span> who’s cases were finalised during this reporting period
          </h3>

          {categoriesWithCases.length === 0 ? (
            <div className="text-sm text-slate-500 italic">
              No categories with finalised cases to show demographics for.
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {categoriesWithCases.map((category) => {
                const totals = getDemographicTotals(demographic.name, category.name)
                const skipActive = isSkipped(demographic.name, category.name)
                const skipReason = getSkipReason(demographic.name, category.name)
                const isComplete = isDemoCategoryComplete(demographic, category)

                return (
                  <AccordionItem 
                    key={category.name} 
                    value={`${demographic.name}_${category.name}`}
                    className="border rounded-md bg-white overflow-hidden border-slate-300"
                  >
                    <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 hover:no-underline transition-colors">
                      <div className="flex items-center justify-between flex-1 mr-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                            {totals.grandTotal}
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
                      {/* Skip Toggle */}
                      {isEditing && (
                        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                          <Switch
                            checked={skipActive}
                            onCheckedChange={(checked) => handleSkipToggle(demographic.name, category.name, checked)}
                            disabled={!isEditing}
                          />
                          <span className="text-sm text-slate-700">
                            {demographic.skipLabel || `We did not gather detailed ${demographic.name} information for this category`}
                          </span>
                        </div>
                      )}

                      {skipActive ? (
                        /* Skip Reason Textarea */
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Please explain why you did not collect this data <span className="text-red-500">*</span>
                          </label>
                          <Textarea
                            value={skipReason}
                            onChange={(e) => handleInputChange(
                              getSkipReasonFieldKey(demographic.name, category.name),
                              e.target.value,
                              false
                            )}
                            disabled={!isEditing}
                            placeholder="Enter reason..."
                            className="min-h-[80px] text-slate-700"
                          />
                        </div>
                      ) : (
                        /* Demographics Grid */
                        <>
                          <div 
                            className="grid gap-4 mb-3 text-sm text-slate-500"
                            style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${demographic.columns.length}, minmax(80px, 1fr)) 32px` }}
                          >
                            <div>Case type</div>
                            {demographic.columns.map(col => (
                              <div key={col.name}>{col.label}</div>
                            ))}
                            <div></div>
                          </div>

                          {category.caseTypes.map((caseType) => {
                            const rowComplete = isDemoRowComplete(demographic.name, category.name, caseType.name, demographic.columns)
                            
                            return (
                              <div 
                                key={caseType.name} 
                                className="grid gap-4 mb-3 items-center"
                                style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${demographic.columns.length}, minmax(80px, 1fr)) 32px` }}
                              >
                                <div className="text-sm font-medium text-slate-900">{caseType.label}</div>
                                {demographic.columns.map(col => {
                                  const fieldKey = getDemographicFieldKey(demographic.name, category.name, caseType.name, col.name)
                                  return (
                                    <div key={col.name}>
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={getFieldValue(fieldKey)}
                                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
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

                          {/* Totals Row */}
                          <div 
                            className="grid gap-4 pt-3 border-t border-slate-200 items-center"
                            style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${demographic.columns.length}, minmax(80px, 1fr)) 32px` }}
                          >
                            <div className="text-sm font-semibold text-slate-900">Total</div>
                            {demographic.columns.map(col => (
                              <div key={col.name} className="text-sm font-semibold text-slate-700 px-3 py-2 bg-slate-50 rounded">
                                {totals.columnTotals[col.name] || 0}
                              </div>
                            ))}
                            <div></div>
                          </div>

                          {/* Validation Warning */}
                          {totals.grandTotal > (caseTotals[category.name]?.total || 0) && (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                              Client numbers entered exceed total number of cases.
                            </div>
                          )}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      ))}
    </div>
  )
}
