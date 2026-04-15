"use client"

import { Button } from "@/components/ui/button"
import { Field } from "@/types/forms"
import { Plus, Trash2 } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FormField } from "../form-field"
import { useState, useMemo, useEffect, useRef } from "react"

interface PartnershipsLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
  lda_id?: number
  lda_form_id?: number | string
}

export function PartnershipsLayout({ inputField, isEditing, onValueChange, lda_id, lda_form_id }: PartnershipsLayoutProps) {
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined)

  // Group fields by groupIndex
  const groupedFields = inputField.fields?.reduce((acc, field) => {
    if (!field.groupIndex) return acc
    if (!acc[field.groupIndex]) acc[field.groupIndex] = []
    acc[field.groupIndex].push(field)
    return acc
  }, {} as Record<number, Field[]>)

  // Helper to get partnership_type for a group
  const getPartnershipType = (groupItems: Field[]): string => {
    const typeField = groupItems.find(f => f.name.includes('_partnership_type_'))
    return typeField?.value || 'new'
  }

  // Separate existing and new partnerships
  const existingPartnerships = Object.entries(groupedFields || {}).filter(
    ([, items]) => getPartnershipType(items) === 'existing'
  )
  const newPartnerships = Object.entries(groupedFields || {}).filter(
    ([, items]) => getPartnershipType(items) !== 'existing'
  )

  // Get dynamic card title (partner name)
  const getCardTitle = (groupItems: Field[]) => {
    const nameField = groupItems.find(f => f.name.includes('_name_'))
    const name = nameField?.value?.trim()
    return name || ''
  }

  // Check if a partnership group is complete
  const isGroupComplete = (groupItems: Field[]): boolean => {
    return groupItems.every(field => {
      if (!field.required) return true
      if (field.show === false) return true
      const value = field.value?.trim()
      return value !== undefined && value !== ''
    })
  }

  const handleRemove = (groupIndex: number) => {
    if (onValueChange) {
      onValueChange(inputField, `delete:${groupIndex}`)
    }
  }

  const handleAdd = () => {
    if (onValueChange) {
      let currentIndices: number[] = []
      try {
        const parsed = inputField.value ? JSON.parse(inputField.value) : []
        if (Array.isArray(parsed)) {
          currentIndices = parsed
        } else if (typeof parsed === "number") {
          currentIndices = Array.from({ length: parsed }, (_, i) => i + 1)
        }
      } catch {
        currentIndices = Object.keys(groupedFields || {}).map(k => parseInt(k))
      }
      
      const maxIndex = currentIndices.length > 0 ? Math.max(...currentIndices) : 0
      const newIndex = maxIndex + 1
      
      onValueChange(inputField, String(newIndex))
      setOpenAccordion(String(newIndex))

      // Save partnership_type as 'new' for the newly added partnership
      const partnershipTypeField: Field = {
        name: `${inputField.name}_partnership_type_${newIndex}`,
        type: 'text',
        label: '',
        show: false,
        groupIndex: newIndex
      }
      onValueChange(partnershipTypeField, 'new')
    }
  }

  // Calculate overall completion status
  const isComplete = useMemo(() => {
    if (groupedFields) {
      for (const groupItems of Object.values(groupedFields)) {
        if (!isGroupComplete(groupItems)) return false
      }
    }
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedFields])

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

  // Early return moved after all hooks
  if (!inputField.show) return <></>

  // Helper to get field value by name pattern
  const getFieldValue = (groupItems: Field[], pattern: string): string => {
    const field = groupItems.find(f => f.name.includes(pattern))
    return field?.value || ''
  }

  // Helper to parse multiselect values (JSON array or comma-separated)
  const parseMultiSelectValue = (value: string): string[] => {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch {
      return value.split(',').map(v => v.trim()).filter(Boolean)
    }
  }

  // Helper to get label from options by value
  const getLabelFromOptions = (options: Array<{label: string, value: string}> | undefined, value: string): string => {
    if (!options) return value
    const option = options.find(o => o.value === value)
    return option?.label || value
  }

  // Render a partnership card
  const renderPartnershipCard = (groupIndex: string, groupItems: Field[], isExisting: boolean) => {
    const idx = parseInt(groupIndex)
    const title = getCardTitle(groupItems)
    const complete = isGroupComplete(groupItems)
    const displayTitle = title || (isExisting ? `Existing partnership ${idx}` : `New partnership ${idx}`)
    
    // For existing partnerships, get the read-only display values
    const partnerTypes = parseMultiSelectValue(getFieldValue(groupItems, '_partner_type_'))
    const category = getFieldValue(groupItems, '_category_')
    const reason = getFieldValue(groupItems, '_reason_')
    
    // Get options for label lookup
    const partnerTypeField = groupItems.find(f => f.name.includes('_partner_type_'))
    const categoryField = groupItems.find(f => f.name.includes('_category_'))
    
    return (
      <AccordionItem 
        key={groupIndex}
        value={groupIndex}
        className="border rounded-lg border-slate-200 bg-white overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 hover:no-underline transition-colors">
          <div className="flex items-center justify-between flex-1 mr-3">
            <div className="flex items-center gap-2">
              {isExisting && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Existing
                </span>
              )}
              {!isExisting && (
                <span className="text-xs font-medium text-white bg-slate-500 px-2 py-0.5 rounded">
                  New
                </span>
              )}
              <span className="text-sm font-medium text-slate-900 truncate max-w-md">
                {displayTitle}
              </span>
            </div>
            {complete ? (
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
        
        <AccordionContent className="border-t border-slate-200">
          {/* For existing partnerships: show tags and description at top */}
          {isExisting && (
            <div className="p-4 pb-0">
              {/* Tags: Partner Types, Category */}
              <div className="flex flex-wrap gap-2 mb-3">
                {category && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {getLabelFromOptions(categoryField?.options as Array<{label: string, value: string}>, category)}
                  </span>
                )}
                {partnerTypes
                  .filter(pt => isNaN(Number(pt)))
                  .map((pt, i) => (
                  <span key={`pt-${i}`} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                    {getLabelFromOptions(partnerTypeField?.options as Array<{label: string, value: string}>, pt)}
                  </span>
                ))}
              </div>
              
              {/* Reason/Description */}
              {reason && (
                <p className="text-sm text-slate-700 mb-4">{reason}</p>
              )}
              
              {/* Divider */}
              <hr className="border-slate-200" />
            </div>
          )}

          {/* Form Fields */}
          <div className="p-4 px-1 space-y-2">
            {groupItems.map((item, index) => (
              <div key={index}>
                <FormField
                  field={item}
                  isEditing={isEditing}
                  onValueChange={onValueChange}
                  lda_id={lda_id}
                  lda_form_id={lda_form_id}
                />
              </div>
            ))}
          </div>
          
          {/* Delete Button - only for new partnerships */}
          {isEditing && !isExisting && (
            <div className="px-4 pb-4">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleRemove(idx)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete partnership
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <div className={`space-y-4 px-4 ${!inputField.isLast ? "mb-4 border-b" : ""}`}>
      {/* Section Header */}
      {inputField.label && (
        <h3 className="text-lg text-slate-900">
          <span className="font-semibold">{inputField.label}</span>
          {inputField?.subtitle && <> {inputField.subtitle}</>}
        </h3>
      )}

      {inputField?.notice && (
        <div className="mb-3">
          <div className="bg-slate-100 p-3 rounded w-full text-slate-500">
            <p 
              className="text-sm text-slate-500"
              dangerouslySetInnerHTML={{ __html: inputField.notice }}
            />
          </div>
        </div>
      )}

      {/* Existing Partnerships Section */}
      {existingPartnerships.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Ongoing list of <span className="font-semibold">partnerships or collaborations</span></h4>
            <p className="text-sm text-slate-500 mt-1">
              Please check and confirm that the description of your partnerships or collaborations with these organisations or individuals is still correct, or if you are no longer partnered with them, remove them from the list and tell us why.
            </p>
          </div>

          <Accordion 
            type="single" 
            collapsible 
            value={openAccordion}
            onValueChange={setOpenAccordion}
            className="space-y-3"
          >
            {existingPartnerships.map(([groupIndex, groupItems]) => 
              renderPartnershipCard(groupIndex, groupItems, true)
            )}
          </Accordion>
        </div>
      )}

      {/* New Partnerships Section */}
      <div className="space-y-4">
        {(existingPartnerships.length > 0 || newPartnerships.length > 0) && (
          <div>
            <h4 className="text-lg font-semibold text-slate-900">New partnerships or collaborations</h4>
            <p className="text-sm text-slate-500 mt-1">
              Add any new partnerships or collaborations that started during this reporting period.
            </p>
          </div>
        )}

        {newPartnerships.length > 0 && (
          <Accordion 
            type="single" 
            collapsible 
            value={openAccordion}
            onValueChange={setOpenAccordion}
            className="space-y-3"
          >
            {newPartnerships.map(([groupIndex, groupItems]) => 
              renderPartnershipCard(groupIndex, groupItems, false)
            )}
          </Accordion>
        )}
      </div>
      
      {/* Add Button - disabled when not editing */}
      <Button
        type="button"
        variant="default"
        className="w-full mb-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
        onClick={handleAdd}
        disabled={!isEditing}
      >
        <Plus className="h-4 w-4 mr-2" />
        {(inputField.config?.add_button_label as string) || "Add partnership or collaboration"}
      </Button>
    </div>
  )
}
