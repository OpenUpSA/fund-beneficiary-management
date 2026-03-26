"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field } from "@/types/forms"
import { Plus, X, Loader2, Check } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface GardenBeneficiariesLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
  lda_id?: number
  lda_form_id?: number | string
}

interface Garden {
  id: string
  name: string
  isComplete: boolean
  fields: Record<string, string>
}

interface Column {
  name: string
  label: string
}

interface DemographicConfig {
  name: string
  label: string
  columns: Column[]
}

interface Beneficiary {
  name: string
  [key: string]: string
}

interface BeneficiaryData {
  beneficiaries: Beneficiary[]
  noBeneficiaries?: boolean
  noBeneficiariesReason?: string
}

interface FieldValues {
  [key: string]: string
}

export function GardenBeneficiariesLayout({ 
  inputField, 
  isEditing, 
  onValueChange,
  lda_form_id,
}: GardenBeneficiariesLayoutProps) {
  const [fieldValues, setFieldValues] = useState<FieldValues>({})
  const [beneficiaryData, setBeneficiaryData] = useState<Record<string, BeneficiaryData>>({})
  const [gardens, setGardens] = useState<Garden[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  // Get config from JSON - memoize arrays to prevent dependency issues
  const sourceField = (inputField.config?.sourceField as string) || 'community_gardens'
  const gardenNameField = (inputField.config?.gardenNameField as string) || 'garden_name'
  const employeesLabel = (inputField.config?.employeesLabel as string) || 'Employees paid by SCAT funds'
  const employeesDescription = (inputField.config?.employeesDescription as string) || ''
  const employeesColumns: Column[] = useMemo(() => 
    (inputField.config?.employeesColumns as unknown as Column[]) || [
      { name: 'paid_employees', label: 'Paid employees' }
    ],
    [inputField.config?.employeesColumns]
  )
  const demographics: DemographicConfig[] = useMemo(() => 
    (inputField.config?.demographics as unknown as DemographicConfig[]) || [],
    [inputField.config?.demographics]
  )
  const demographicsLabel = (inputField.config?.demographicsLabel as string) || 'Demographics of employees paid by SCAT'
  const beneficiariesLabel = (inputField.config?.beneficiariesLabel as string) || 'Beneficiaries supported'
  const beneficiariesDescription = (inputField.config?.beneficiariesDescription as string) || ''
  const beneficiariesColumns: Column[] = (inputField.config?.beneficiariesColumns as unknown as Column[]) || [
    { name: 'individuals', label: 'Individuals' },
    { name: 'food_provided', label: 'Food provided (kg)' }
  ]

  // Get required fields from config (fields that must be filled for a garden to be complete)
  const requiredFields: string[] = useMemo(() => 
    (inputField.config?.requiredFields as unknown as string[]) || [
      'garden_name', 'garden_size', 'garden_address', 'contact_person', 'contact_number', 'external_support'
    ],
    [inputField.config?.requiredFields]
  )

  // Fetch gardens from API
  const fetchGardens = useCallback(async () => {
    if (!lda_form_id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        sourceField,
        nameField: gardenNameField,
        requiredFields: requiredFields.join(',')
      })
      
      const response = await fetch(`/api/lda-form/${lda_form_id}/linked-data?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch garden data')
      }
      
      const data = await response.json()
      // Convert id to string for consistency with helper functions
      const gardensWithStringId = (data.gardens || []).map((g: { id: number; name: string; isComplete: boolean; fields: Record<string, string> }) => ({
        ...g,
        id: String(g.id)
      }))
      setGardens(gardensWithStringId)
      
      // Clean up orphaned fields if any
      if (data.orphanedFields && data.orphanedFields.length > 0) {
        await fetch(`/api/lda-form/${lda_form_id}/linked-data`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldsToDelete: data.orphanedFields })
        })
      }
    } catch (err) {
      console.error('Error fetching gardens:', err)
      setError('Failed to load garden data')
    } finally {
      setIsLoading(false)
    }
  }, [lda_form_id, sourceField, gardenNameField, requiredFields])

  // Fetch gardens on mount
  useEffect(() => {
    fetchGardens()
  }, [fetchGardens])

  // Helper to get empty beneficiary data
  const getEmptyBeneficiaryData = (): BeneficiaryData => ({
    beneficiaries: [],
    noBeneficiaries: false,
    noBeneficiariesReason: ''
  })

  // Initialize beneficiaries from saved data
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    
    const values: FieldValues = {}
    const benefData: Record<string, BeneficiaryData> = {}
    
    inputField.fields?.forEach(field => {
      if (field.value) {
        values[field.name] = field.value
        
        // Parse beneficiaries data
        if (field.name.endsWith('_beneficiaries')) {
          const gardenId = field.name.replace(`${inputField.name}_`, '').replace('_beneficiaries', '')
          try {
            const parsed = JSON.parse(field.value)
            // Handle both old format (array) and new format (object)
            if (Array.isArray(parsed)) {
              benefData[gardenId] = {
                beneficiaries: parsed,
                noBeneficiaries: false,
                noBeneficiariesReason: ''
              }
            } else if (parsed.beneficiaries !== undefined || parsed.noBeneficiaries !== undefined) {
              benefData[gardenId] = {
                beneficiaries: parsed.beneficiaries || [],
                noBeneficiaries: parsed.noBeneficiaries || false,
                noBeneficiariesReason: parsed.noBeneficiariesReason || ''
              }
            } else {
              benefData[gardenId] = getEmptyBeneficiaryData()
            }
          } catch {
            benefData[gardenId] = getEmptyBeneficiaryData()
          }
        }
      }
    })
    
    setFieldValues(values)
    setBeneficiaryData(benefData)
  }, [inputField.fields, inputField.name])

  // Field key generators (defined before useMemo that uses them)
  const getEmployeesFieldKey = useCallback((gardenId: string, columnName: string) => {
    return `${inputField.name}_employees_${gardenId}_${columnName}`
  }, [inputField.name])

  const getDemographicFieldKey = useCallback((demographic: string, gardenId: string, columnName: string) => {
    return `${inputField.name}_${demographic}_${gardenId}_${columnName}`
  }, [inputField.name])

  // Get field value
  const getFieldValue = useCallback((fieldKey: string): string => {
    if (fieldValues[fieldKey]) return fieldValues[fieldKey]
    const existingField = inputField.fields?.find(f => f.name === fieldKey)
    return existingField?.value || ''
  }, [fieldValues, inputField.fields])

  // Handle input change
  const handleInputChange = useCallback((fieldKey: string, value: string, isNumeric: boolean = true) => {
    const finalValue = isNumeric ? value.replace(/[^0-9]/g, '') : value
    
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: finalValue
    }))
    
    if (onValueChange) {
      const existingField = inputField.fields?.find(f => f.name === fieldKey)
      const field = existingField || {
        name: fieldKey,
        type: 'text',
        label: '',
        value: finalValue,
        show: true
      }
      onValueChange(field, finalValue)
    }
  }, [onValueChange, inputField.fields])

  // Calculate totals for employees
  const employeesTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    employeesColumns.forEach(col => {
      let sum = 0
      gardens.forEach(garden => {
        const key = `${inputField.name}_employees_${garden.id}_${col.name}`
        const value = fieldValues[key] || inputField.fields?.find(f => f.name === key)?.value || '0'
        sum += parseInt(value) || 0
      })
      totals[col.name] = sum
    })
    return totals
  }, [fieldValues, gardens, employeesColumns, inputField.fields, inputField.name])

  // Calculate totals for demographics
  const getDemographicTotals = useCallback((demographic: string, columns: Column[]) => {
    const totals: Record<string, number> = {}
    columns.forEach(col => {
      let sum = 0
      gardens.forEach(garden => {
        const key = `${inputField.name}_${demographic}_${garden.id}_${col.name}`
        const value = fieldValues[key] || inputField.fields?.find(f => f.name === key)?.value || '0'
        sum += parseInt(value) || 0
      })
      totals[col.name] = sum
    })
    return totals
  }, [gardens, fieldValues, inputField.fields, inputField.name])

  // Save beneficiary data helper
  const saveBeneficiaryData = useCallback((gardenId: string, data: BeneficiaryData) => {
    const fieldKey = `${inputField.name}_${gardenId}_beneficiaries`
    const jsonValue = JSON.stringify(data)
    
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: jsonValue
    }))
    
    if (onValueChange) {
      const existingField = inputField.fields?.find(f => f.name === fieldKey)
      const field = existingField || {
        name: fieldKey,
        type: 'text',
        label: '',
        value: jsonValue,
        show: true
      }
      onValueChange(field, jsonValue)
    }
  }, [inputField.name, inputField.fields, onValueChange])

  // Beneficiary management
  const addBeneficiary = useCallback((gardenId: string) => {
    const newBeneficiary: Beneficiary = { name: '', individuals: '', food_provided: '' }
    const current = beneficiaryData[gardenId] || getEmptyBeneficiaryData()
    const updated: BeneficiaryData = {
      ...current,
      beneficiaries: [...current.beneficiaries, newBeneficiary]
    }
    setBeneficiaryData(prev => ({ ...prev, [gardenId]: updated }))
    saveBeneficiaryData(gardenId, updated)
  }, [beneficiaryData, saveBeneficiaryData])

  const removeBeneficiary = useCallback((gardenId: string, index: number) => {
    const current = beneficiaryData[gardenId] || getEmptyBeneficiaryData()
    const updated: BeneficiaryData = {
      ...current,
      beneficiaries: current.beneficiaries.filter((_: Beneficiary, i: number) => i !== index)
    }
    setBeneficiaryData(prev => ({ ...prev, [gardenId]: updated }))
    saveBeneficiaryData(gardenId, updated)
  }, [beneficiaryData, saveBeneficiaryData])

  const updateBeneficiary = useCallback((gardenId: string, index: number, field: string, value: string) => {
    const current = beneficiaryData[gardenId] || getEmptyBeneficiaryData()
    const updatedBeneficiaries = [...current.beneficiaries]
    updatedBeneficiaries[index] = { ...updatedBeneficiaries[index], [field]: value }
    const updated: BeneficiaryData = {
      ...current,
      beneficiaries: updatedBeneficiaries
    }
    setBeneficiaryData(prev => ({ ...prev, [gardenId]: updated }))
    saveBeneficiaryData(gardenId, updated)
  }, [beneficiaryData, saveBeneficiaryData])

  // Toggle noBeneficiaries for a garden
  const toggleNoBeneficiaries = useCallback((gardenId: string, checked: boolean) => {
    const current = beneficiaryData[gardenId] || getEmptyBeneficiaryData()
    const updated: BeneficiaryData = {
      ...current,
      noBeneficiaries: checked,
      noBeneficiariesReason: checked ? current.noBeneficiariesReason : ''
    }
    setBeneficiaryData(prev => ({ ...prev, [gardenId]: updated }))
    saveBeneficiaryData(gardenId, updated)
  }, [beneficiaryData, saveBeneficiaryData])

  // Update noBeneficiaries reason
  const updateNoBeneficiariesReason = useCallback((gardenId: string, reason: string) => {
    setBeneficiaryData(prev => {
      const current = prev[gardenId] || getEmptyBeneficiaryData()
      return { ...prev, [gardenId]: { ...current, noBeneficiariesReason: reason } }
    })
  }, [])

  // Save noBeneficiaries reason on blur
  const saveNoBeneficiariesReason = useCallback((gardenId: string) => {
    setBeneficiaryData(prev => {
      const current = prev[gardenId] || getEmptyBeneficiaryData()
      saveBeneficiaryData(gardenId, current)
      return prev
    })
  }, [saveBeneficiaryData])

  // Check if garden beneficiaries section is incomplete
  const isGardenBeneficiariesIncomplete = useCallback((gardenId: string) => {
    const data = beneficiaryData[gardenId] || getEmptyBeneficiaryData()
    
    // If noBeneficiaries is checked, check if reason is provided
    if (data.noBeneficiaries) {
      return !data.noBeneficiariesReason || data.noBeneficiariesReason.trim() === ''
    }
    
    // If no beneficiaries at all (and noBeneficiaries not checked), it's incomplete
    if (data.beneficiaries.length === 0) {
      return true
    }
    
    // Check if any beneficiary has incomplete data
    return data.beneficiaries.some(b => 
      !b.name || b.name.trim() === '' || 
      !b.individuals || b.individuals.trim() === ''
    )
  }, [beneficiaryData])

  // Get beneficiary count for a garden
  const getBeneficiaryCount = useCallback((gardenId: string) => {
    const data = beneficiaryData[gardenId] || getEmptyBeneficiaryData()
    return data.beneficiaries.length
  }, [beneficiaryData])

  // Check if all rows in a demographic are complete
  const isDemographicComplete = useCallback((demographic: string, columns: Column[]) => {
    return gardens.every(garden => 
      columns.every(col => {
        const key = `${inputField.name}_${demographic}_${garden.id}_${col.name}`
        const value = fieldValues[key] || inputField.fields?.find(f => f.name === key)?.value || ''
        return value !== '' && value !== undefined
      })
    )
  }, [gardens, fieldValues, inputField.fields, inputField.name])

  // Calculate overall completion status
  const isComplete = useMemo(() => {
    if (gardens.length === 0) return true // No gardens = nothing to complete, consider complete
    return demographics.every(demo => isDemographicComplete(demo.name, demo.columns))
  }, [gardens, demographics, isDemographicComplete])

  // Get status field name from config
  const statusFieldName = (inputField.config?.statusField as string) || null

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

  // Early returns after ALL hooks
  if (inputField.show === false) return <></>

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading garden data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4 bg-red-50 rounded-lg">
        {error}
        <Button variant="link" onClick={fetchGardens} className="ml-2">
          Retry
        </Button>
      </div>
    )
  }

  if (gardens.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg">
        No community gardens have been added yet. Please add gardens in the previous section first.
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4">
      {/* SECTION 1: Employees paid by SCAT funds */}
      <div className="space-y-2">
        <div className="flex items-center">
          <h3 className="text-lg text-slate-900"><span className="font-semibold">{employeesLabel}</span> for each community garden</h3>
        </div>
      </div>
        
      {employeesDescription && (
        <p className="text-sm text-slate-600 pb-4">{employeesDescription}</p>
      )}

      <Accordion type="single" collapsible className="space-y-2">
        {(() => {
          // Check if all employee rows are complete
          const isEmployeesComplete = gardens.every(garden => 
            employeesColumns.every(col => {
              const fieldKey = getEmployeesFieldKey(garden.id, col.name)
              const value = getFieldValue(fieldKey)
              return value !== '' && value !== undefined
            })
          )

          return (
            <AccordionItem value="employees" className="border rounded-md bg-white overflow-hidden border-slate-300">
              <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 hover:no-underline transition-colors">
                <div className="flex items-center justify-between flex-1 mr-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                      {Object.values(employeesTotals).reduce((a, b) => a + b, 0)}
                    </span>
                    <span className="font-semibold text-slate-900">{employeesLabel}</span>
                  </div>
                  {isEmployeesComplete ? (
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

          <AccordionContent className="border-t border-slate-200 p-5 pb-4">
            {/* Header */}
            <div 
              className="grid gap-4 mb-3 text-sm text-slate-500"
              style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${employeesColumns.length}, minmax(100px, 1fr)) 32px` }}
            >
              <div>Community farm</div>
              {employeesColumns.map(col => (
                <div key={col.name}>{col.label}</div>
              ))}
              <div></div>
            </div>

            {/* Garden rows */}
            {gardens.map((garden) => {
              // Check if all values are filled for this row
              const isRowComplete = employeesColumns.every(col => {
                const fieldKey = getEmployeesFieldKey(garden.id, col.name)
                const value = getFieldValue(fieldKey)
                return value !== '' && value !== undefined
              })

              return (
                <div 
                  key={garden.id}
                  className="grid gap-4 py-2 items-center"
                  style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${employeesColumns.length}, minmax(100px, 1fr)) 32px` }}
                >
                  <div className="text-sm font-medium text-slate-900">{garden.name}</div>
                  {employeesColumns.map(col => {
                    const fieldKey = getEmployeesFieldKey(garden.id, col.name)
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
                    {isRowComplete && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              )
            })}

            {/* Totals row */}
            <div 
              className="grid gap-4 pt-3 mt-3 border-t border-slate-200 items-center"
              style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${employeesColumns.length}, minmax(100px, 1fr)) 32px` }}
            >
              <div className="text-sm font-semibold text-slate-900">Total</div>
              {employeesColumns.map(col => (
                <div key={col.name} className="text-sm font-semibold text-slate-700 px-3 py-2 bg-slate-50 rounded">
                  {employeesTotals[col.name] || 0}
                </div>
              ))}
              <div></div>
            </div>
          </AccordionContent>
        </AccordionItem>
          )
        })()}
      </Accordion>

      {/* SECTION 2: Demographics */}
      {demographics.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <h3 className="text-lg text-slate-900"><span className="font-semibold">{demographicsLabel}</span> for each community garden</h3>
            </div>
          </div>
          
          <Accordion type="single" collapsible className="space-y-2">
            {demographics.map((demo) => {
              const totals = getDemographicTotals(demo.name, demo.columns)
              const isComplete = isDemographicComplete(demo.name, demo.columns)

              return (
                <AccordionItem key={demo.name} value={demo.name} className="border rounded-lg bg-white overflow-hidden">
                  <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 hover:no-underline transition-colors">
                    <div className="flex items-center justify-between flex-1 mr-3">
                      <span className="font-semibold text-slate-900">{demo.label}</span>
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
                    {/* Header */}
                    <div 
                      className="grid gap-4 mb-3 text-sm text-slate-500"
                      style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${demo.columns.length}, minmax(80px, 1fr)) 32px` }}
                    >
                      <div>Community farm</div>
                      {demo.columns.map(col => (
                        <div key={col.name}>{col.label}</div>
                      ))}
                      <div></div>
                    </div>

                    {/* Garden rows */}
                    {gardens.map((garden) => {
                      // Calculate row total for this garden
                      const rowTotal = demo.columns.reduce((sum, col) => {
                        const fieldKey = getDemographicFieldKey(demo.name, garden.id, col.name)
                        const value = getFieldValue(fieldKey)
                        return sum + (parseInt(value) || 0)
                      }, 0)

                      // Check if all values are filled for this row
                      const isRowComplete = demo.columns.every(col => {
                        const fieldKey = getDemographicFieldKey(demo.name, garden.id, col.name)
                        const value = getFieldValue(fieldKey)
                        return value !== '' && value !== undefined
                      })

                      return (
                        <div 
                          key={garden.id}
                          className="grid gap-4 mb-3 items-center"
                          style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${demo.columns.length}, minmax(80px, 1fr)) 32px` }}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                            <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                              {rowTotal}
                            </span>
                            {garden.name}
                          </div>
                          {demo.columns.map(col => {
                            const fieldKey = getDemographicFieldKey(demo.name, garden.id, col.name)
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
                            {isRowComplete && (
                              <Check className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Totals row */}
                    <div 
                      className="grid gap-4 pt-3 border-t border-slate-200 items-center"
                      style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${demo.columns.length}, minmax(80px, 1fr)) 32px` }}
                    >
                      <div className="text-sm font-semibold">Total</div>
                      {demo.columns.map(col => (
                        <div key={col.name} className="text-sm font-semibold text-slate-600 px-3 py-2 bg-slate-50 rounded">
                          {totals[col.name] || 0}
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
      )}

      {/* SECTION 3: Beneficiaries supported */}
      <div className="space-y-2 pt-4">
        <div className="space-y-2">
          <div className="flex items-center">
            <h3 className="text-lg text-slate-900"><span className="font-semibold">{beneficiariesLabel}</span> for each community garden</h3>
          </div>
        </div>
        
        {beneficiariesDescription && (
          <p className="text-sm text-slate-600 pb-4">{beneficiariesDescription}</p>
        )}

        <Accordion type="single" collapsible className="space-y-2">
          {gardens.map((garden) => {
            const data = beneficiaryData[garden.id] || getEmptyBeneficiaryData()
            const gardenBeneficiaries = data.beneficiaries
            const isIncomplete = isGardenBeneficiariesIncomplete(garden.id)
            const beneficiaryCount = getBeneficiaryCount(garden.id)

            return (
              <AccordionItem key={garden.id} value={garden.id} className="border rounded-lg bg-white overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 hover:no-underline transition-colors">
                  <div className="flex items-center justify-between flex-1 mr-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                        {beneficiaryCount}
                      </span>
                      <span className="font-semibold text-slate-900">{garden.name}</span>
                    </div>
                    {isIncomplete && (
                      <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded">
                        Incomplete
                      </span>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="border-t border-slate-200 p-4 pb-4">
                  {/* No Beneficiaries Toggle - only show when there are no beneficiaries */}
                  {isEditing && gardenBeneficiaries.length === 0 && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={data.noBeneficiaries || false}
                          onCheckedChange={(checked) => toggleNoBeneficiaries(garden.id, checked)}
                        />
                        <span className="text-sm text-slate-700">This garden has no beneficiaries this term</span>
                      </div>
                      {data.noBeneficiaries && (
                        <div className="mt-3">
                          <Textarea
                            placeholder="Please provide a reason (required)"
                            value={data.noBeneficiariesReason || ''}
                            onChange={(e) => updateNoBeneficiariesReason(garden.id, e.target.value)}
                            onBlur={() => saveNoBeneficiariesReason(garden.id)}
                            className="min-h-[60px] text-sm text-slate-700"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show no beneficiaries reason in view mode */}
                  {!isEditing && data.noBeneficiaries && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">No beneficiaries this term.</span>
                        {data.noBeneficiariesReason && <span className="ml-1">Reason: {data.noBeneficiariesReason}</span>}
                      </p>
                    </div>
                  )}

                  {/* Show empty state if no beneficiaries and toggle not checked */}
                  {!data.noBeneficiaries && gardenBeneficiaries.length === 0 && (
                    <div className="text-sm text-slate-500 italic py-5 text-center">
                      No beneficiaries added yet. {isEditing && <>Click the button below to add beneficiaries.</>}
                    </div>
                  )}

                  {/* Beneficiary rows - only show if not noBeneficiaries */}
                  {!data.noBeneficiaries && gardenBeneficiaries.length > 0 && (
                    <>
                      {/* Header */}
                      <div 
                        className="grid gap-4 mb-3 text-sm text-slate-500"
                        style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${beneficiariesColumns.length}, minmax(100px, 1fr)) 40px` }}
                      >
                        <div>Beneficiary name</div>
                        {beneficiariesColumns.map(col => (
                          <div key={col.name}>{col.label}</div>
                        ))}
                        <div></div>
                      </div>

                      {gardenBeneficiaries.map((beneficiary: Beneficiary, bIdx: number) => (
                        <div 
                          key={bIdx}
                          className="grid gap-4 mb-3 items-center"
                          style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${beneficiariesColumns.length}, minmax(100px, 1fr)) 40px` }}
                        >
                          <div>
                            <Input
                              type="text"
                              value={beneficiary.name}
                              onChange={(e) => updateBeneficiary(garden.id, bIdx, 'name', e.target.value)}
                              disabled={!isEditing}
                              className="h-9 text-slate-700"
                              placeholder="Enter beneficiary name"
                            />
                          </div>
                          {beneficiariesColumns.map(col => (
                            <div key={col.name}>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={beneficiary[col.name] || ''}
                                onChange={(e) => updateBeneficiary(garden.id, bIdx, col.name, e.target.value.replace(/[^0-9]/g, ''))}
                                disabled={!isEditing}
                                className="h-9 text-slate-700"
                                placeholder=""
                              />
                            </div>
                          ))}
                          <div>
                            {isEditing && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBeneficiary(garden.id, bIdx)}
                                className="h-9 w-9 p-0 text-slate-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Add beneficiary button - hidden when noBeneficiaries is checked */}
                  {isEditing && !data.noBeneficiaries && (
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => addBeneficiary(garden.id)}
                      className="w-full mt-2 bg-slate-900 hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add beneficiary
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </div>
  )
}
