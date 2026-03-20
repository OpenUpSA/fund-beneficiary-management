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

interface ChallengesLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
  lda_id?: number
  lda_form_id?: number | string
}

export function ChallengesLayout({ inputField, isEditing, onValueChange, lda_id, lda_form_id }: ChallengesLayoutProps) {
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined)

  if (!inputField.show) return <></>

  // Group fields by groupIndex
  const groupedFields = inputField.fields?.reduce((acc, field) => {
    if (!field.groupIndex) return acc
    if (!acc[field.groupIndex]) acc[field.groupIndex] = []
    acc[field.groupIndex].push(field)
    return acc
  }, {} as Record<number, Field[]>)

  // Helper to get challenge_type for a group
  const getChallengeType = (groupItems: Field[]): string => {
    const typeField = groupItems.find(f => f.name.includes('_challenge_type_'))
    return typeField?.value || 'new'
  }

  // Separate existing and new challenges
  const existingChallenges = Object.entries(groupedFields || {}).filter(
    ([, items]) => getChallengeType(items) === 'existing'
  )
  const newChallenges = Object.entries(groupedFields || {}).filter(
    ([, items]) => getChallengeType(items) !== 'existing'
  )

  // Get dynamic card title
  const getCardTitle = (groupItems: Field[]) => {
    const titleField = groupItems.find(f => f.name.includes('_title_'))
    const title = titleField?.value?.trim()
    return title || ''
  }

  // Check if a challenge group is complete
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
      
      // Save challenge_type as 'new' for the newly added challenge
      const challengeTypeField: Field = {
        name: `${inputField.name}_challenge_type_${newIndex}`,
        type: 'text',
        label: '',
        show: false,
        groupIndex: newIndex
      }
      onValueChange(challengeTypeField, 'new')
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
  }, [groupedFields, inputField.fields])

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

  // Render a challenge card
  const renderChallengeCard = (groupIndex: string, groupItems: Field[], isExisting: boolean) => {
    const idx = parseInt(groupIndex)
    const title = getCardTitle(groupItems)
    const complete = isGroupComplete(groupItems)
    const displayTitle = title || (isExisting ? `Existing challenge ${idx}` : `New challenge ${idx}`)
    
    // For existing challenges, get the read-only display values
    const impactScope = getFieldValue(groupItems, '_impact_scope_')
    const categories = parseMultiSelectValue(getFieldValue(groupItems, '_categories_'))
    const description = getFieldValue(groupItems, '_description_')
    
    // Get options for label lookup
    const categoriesField = groupItems.find(f => f.name.includes('_categories_'))
    const impactField = groupItems.find(f => f.name.includes('_impact_scope_'))

    // Fields to show in form (exclude the read-only fields for existing challenges)
    const existingOnlyField = ['_has_updates_']
    const formFields = isExisting 
      ? groupItems
      : groupItems.filter(item => !existingOnlyField.some(field => item.name.includes(field)))
    
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
          {/* For existing challenges: show tags and description at top */}
          {isExisting && (
            <div className="p-4 pb-0">
              {/* Tags: Impact, Categories, Focus Areas */}
              <div className="flex flex-wrap gap-2 mb-3">
                {impactScope && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {getLabelFromOptions(impactField?.options as Array<{label: string, value: string}>, impactScope)}
                  </span>
                )}
                {categories.map((cat, i) => (
                  <span key={`cat-${i}`} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                    {getLabelFromOptions(categoriesField?.options as Array<{label: string, value: string}>, cat)}
                  </span>
                ))}
              </div>
              
              {/* Description */}
              {description && (
                <p className="text-sm text-slate-700 mb-4">{description}</p>
              )}
              
              {/* Divider */}
              <hr className="border-slate-200" />
            </div>
          )}

          {/* Form Fields */}
          <div className="p-4 px-1 space-y-2">
            {formFields.map((item, index) => (
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
          
          {/* Delete Button - only for new challenges */}
          {isEditing && !isExisting && (
            <div className="px-4 pb-4">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleRemove(idx)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete challenge
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

      {/* Existing Challenges Section */}
      {existingChallenges.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-semibold text-slate-900">Ongoing challenges</h4>
            <p className="text-sm text-slate-500 mt-1">
              Please let us know if the challenges added in previous narrative reports are still an issue during this reporting period. 
              If they are no longer issues, please let us know how they were resolved or overcome.
            </p>
          </div>

          <Accordion 
            type="single" 
            collapsible 
            value={openAccordion}
            onValueChange={setOpenAccordion}
            className="space-y-3"
          >
            {existingChallenges.map(([groupIndex, groupItems]) => 
              renderChallengeCard(groupIndex, groupItems, true)
            )}
          </Accordion>
        </div>
      )}

      {/* New Challenges Section */}
      <div className="space-y-4">
        {(existingChallenges.length > 0 || newChallenges.length > 0) && (
          <div>
            <h4 className="text-md font-semibold text-slate-900">New challenges</h4>
            <p className="text-sm text-slate-500 mt-1">
              Add any new challenges that arose during this reporting period.
            </p>
          </div>
        )}

        {newChallenges.length > 0 && (
          <Accordion 
            type="single" 
            collapsible 
            value={openAccordion}
            onValueChange={setOpenAccordion}
            className="space-y-3"
          >
            {newChallenges.map(([groupIndex, groupItems]) => 
              renderChallengeCard(groupIndex, groupItems, false)
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
        Add new challenge
      </Button>
    </div>
  )
}
