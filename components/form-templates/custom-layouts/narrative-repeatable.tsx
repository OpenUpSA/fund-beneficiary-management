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
import { useState } from "react"
import { format } from "date-fns"

interface NarrativeRepeatableLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
  lda_id?: number
  lda_form_id?: number | string
}

export function NarrativeRepeatableLayout({ inputField, isEditing, onValueChange, lda_id, lda_form_id }: NarrativeRepeatableLayoutProps) {
  const [openAccordion, setOpenAccordion] = useState<string | undefined>("1")

  if (!inputField.show) return <></>

  // Group fields by groupIndex
  const groupedFields = inputField.fields?.reduce((acc, field) => {
    if (!field.groupIndex) return acc
    if (!acc[field.groupIndex]) acc[field.groupIndex] = []
    acc[field.groupIndex].push(field)
    return acc
  }, {} as Record<number, Field[]>)

  // Get dynamic card title based on name and date fields
  const getCardTitle = (groupIndex: number, groupItems: Field[]) => {
    const defaultLabel = typeof inputField?.config?.cardLabel === 'string' 
      ? inputField.config.cardLabel 
      : 'Item'
    
    // Find name and date fields in this group
    const nameField = groupItems.find(f => f.name.includes('_name_') || f.name.includes('_name'))
    const dateField = groupItems.find(f => f.name.includes('_date_') || f.name.includes('_date'))
    
    const name = nameField?.value?.trim()
    const date = dateField?.value
    
    if (name && date) {
      try {
        const formattedDate = format(new Date(date), 'd MMM yyyy')
        return <><span className="font-semibold">{name}</span> ({formattedDate})</>
      } catch {
        return <span className="font-semibold">{name || `${defaultLabel} ${groupIndex}`}</span>
      }
    }
    
    if (name) return <span className="font-semibold">{name}</span>
    
    return <span className="font-semibold">{`${defaultLabel} ${groupIndex}`}</span>
  }

  // Check if a group is complete (all required fields have values)
  const isGroupComplete = (groupItems: Field[]): boolean => {
    return groupItems.every(field => {
      // Skip non-required fields
      if (!field.required) return true
      // Skip fields that are hidden via show_if
      if (field.show === false) return true
      // Check if field has a value
      const value = field.value?.trim()
      return value !== undefined && value !== ''
    })
  }

  const handleRemove = (groupIndex: number) => {
    if (onValueChange) {
      // Use delete:INDEX format to delete specific item
      onValueChange(inputField, `delete:${groupIndex}`)
    }
  }

  const handleAdd = () => {
    if (onValueChange) {
      // Get current indices from value (array format) or from existing groups
      let currentIndices: number[] = []
      try {
        const parsed = inputField.value ? JSON.parse(inputField.value) : []
        if (Array.isArray(parsed)) {
          currentIndices = parsed
        } else if (typeof parsed === "number") {
          currentIndices = Array.from({ length: parsed }, (_, i) => i + 1)
        }
        console.log("currentIndices", currentIndices)
      } catch (error) {
        console.error("Error parsing inputField.value:", error, "value:", inputField.value)
        // Fall back to getting indices from grouped fields
        currentIndices = Object.keys(groupedFields || {}).map(k => parseInt(k))
      }
      
      // Find next available index (max + 1)
      const maxIndex = currentIndices.length > 0 ? Math.max(...currentIndices) : 0
      const newIndex = maxIndex + 1
      
      console.log("inputField", inputField)
      console.log("newIndex", String(newIndex))
      // Signal to add a new item (form-accordion-item will handle the rest)
      onValueChange(inputField, String(newIndex))
      setOpenAccordion(String(newIndex))
      
      // Check template fields for prefill with source defaultValue and save via onValueChange
      if (inputField.template) {
        const prefillFields = inputField.template.filter(
          (f: Field) => f.prefill?.source === 'defaultValue' && f.prefill?.path
        )
        
        for (const templateField of prefillFields) {
          const prefillField: Field = {
            name: `${inputField.name}_${templateField.name}_${newIndex}`,
            type: templateField.type,
            label: templateField.label || '',
            show: templateField.show !== false,
            groupIndex: newIndex
          }
          onValueChange(prefillField, templateField.prefill?.path || '')
        }
      }
    }
  }

  const groupCount = Object.keys(groupedFields || {}).length

  return (
    <div className={`space-y-2 px-4 mb-4 ${!inputField.isLast ? "mb-4 border-b pb-4" : ""}`}>
      <h3 className="text-lg text-slate-900"><span className="font-semibold">{inputField.label}</span> {inputField?.subtitle && <>{inputField.subtitle}</>}</h3>

      {inputField?.notice && (
        <div className="mb-3">
          <div className="flex">
            <div className="bg-slate-100 p-3 rounded w-full text-slate-500">
              <p 
                className="text-sm text-slate-500"
                dangerouslySetInnerHTML={{ __html: inputField.notice }}
              />
            </div>
          </div>
        </div>
      )}

      {inputField.description && (
        <div className="mb-4">
          <div className="flex">
            <div className="p-2 rounded px-2 w-full">
              <p className="text-sm text-slate-500">
                <p 
                className="text-sm text-slate-500"
                dangerouslySetInnerHTML={{ __html: inputField.description }}
              />
              </p>
            </div>
          </div>
        </div>
      )}
      
      <Accordion 
        type="single" 
        collapsible 
        value={openAccordion}
        onValueChange={setOpenAccordion}
        className="space-y-3"
      >
        {Object.entries(groupedFields || {}).map(([groupIndex, groupItems]) => {
          const idx = parseInt(groupIndex)
          const title = getCardTitle(idx, groupItems)
          const isComplete = isGroupComplete(groupItems)
          
          return (
            <AccordionItem 
              key={groupIndex} 
              value={groupIndex}
              className="border rounded-lg border-slate-200 bg-white overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-5 hover:bg-slate-50 hover:no-underline transition-colors">
                <div className="flex items-center justify-between flex-1 mr-3">
                  <span className="text-sm text-slate-900">{title}</span>
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
              
              <AccordionContent className="border-t border-slate-200">
                <div className="p-4 space-y-2">
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
                
                {/* Delete Button - Red, at bottom - show on all activities (allows deleting to 0) */}
                {isEditing && groupCount >= 1 && (
                  <div className="px-4 pb-4">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(idx)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {typeof inputField?.config?.removeLable === 'string' 
                        ? inputField.config.removeLable 
                        : 'Delete'}
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      
      {/* Add Button - Full Width, Dark - disabled when not editing */}
      <Button
        type="button"
        variant="default"
        className="w-full mb-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
        onClick={handleAdd}
        disabled={!isEditing}
      >
        <Plus className="h-4 w-4 mr-2" />
        {typeof inputField?.config?.add_button_label === 'string' 
          ? inputField.config.add_button_label 
          : 'Add'}
      </Button>
    </div>
  )
}
