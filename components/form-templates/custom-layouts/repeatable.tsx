"use client"

import { Button } from "@/components/ui/button"
import { Field } from "@/types/forms"
import { Plus } from "lucide-react"
import { FormField } from "../form-field"

interface RepeatableLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function RepeatableLayout({ inputField, isEditing, onValueChange }: RepeatableLayoutProps) {

  if (!inputField.show) return <></>;

  // group and sort inputField.fields by key groupIndex
  const groupedFields = inputField.fields?.reduce((acc, field) => {
    if (!field.groupIndex) return acc;
    if (!acc[field.groupIndex]) acc[field.groupIndex] = [];
    acc[field.groupIndex].push(field);
    return acc;
  }, [] as Record<number, Field[]>);

  return (
    <div className={`space-y-4 px-4 ${!inputField.isLast ? "mb-4 border-b" : ""}`}>
      {inputField?.notice && (
          <div className="mb-4">
            <div className="flex">
              <div className="bg-slate-100 p-2 rounded px-2 w-full">
                <p className="text-sm text-slate-500">
                  <span className="font-medium">Important:</span> <span className="font-normal">{inputField.notice}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      <h3 className="text-lg font-medium text-slate-900">{inputField.label}</h3>
      <div className="space-y-2">
      {Object.entries(groupedFields || {}).map(([groupIndex, groupItems]) => (
        <div key={groupIndex} className="space-y-2 border rounded border-slate-300">
          <div className="flex items-center justify-between border-b p-4 border-slate-300">
            <span className="text-sm font-medium text-slate-900">
              {typeof inputField?.config?.cardLabel === 'string' ? inputField.config.cardLabel : inputField.name.charAt(0).toUpperCase() + inputField.name.slice(1)} {groupIndex}
            </span>
            {/* Add remove button for the last challenge if there's more than one */}
            {parseInt(groupIndex) === Object.keys(groupedFields || {}).length && Object.keys(groupedFields || {}).length > 1 && isEditing && (
              <button
                type="button"
                className="text-sm text-slate-700 underline"
                onClick={() => {
                  if (onValueChange) {
                    const currentValue = JSON.parse(inputField.value || "0");
                    onValueChange(inputField, String(Math.max(0, currentValue - 1)));
                  }
                }}
              >
                {typeof inputField?.config?.removeLable === 'string' ? inputField.config.removeLable : 'Remove challenge'}
              </button>
            )}
          </div>
          <div className="p-4">
            {groupItems.map((item, index) => (
              <div key={index} className="py-2">
                <FormField
                  key={index}
                  field={item}
                  isEditing={isEditing}
                  onValueChange={onValueChange}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
      {isEditing && <div className="flex items-center justify-end">
        <Button
          variant="default"
          className="mb-4"
          onClick={() => {
            if (onValueChange) {
              onValueChange(inputField, String(JSON.parse(inputField.value || "0") + 1));
            }
          }}
        >
          <Plus className="h-4 w-4" />
          {typeof inputField?.config?.add_button_label === 'string' ? inputField.config.add_button_label : 'Add'}
        </Button>
      </div>}
    </div>
  )
}