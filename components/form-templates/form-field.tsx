"use client"

import { Field } from "@/types/forms"
import { FieldError } from "react-hook-form"
import { CircleSmall } from "lucide-react"
import {
  TextareaField,
  RadioField,
  SelectField,
  DateField,
  TextField,
  GroupField,
  DefaultField,
  CurrencyField
} from "@/components/form-templates/custom-components"

interface FormFieldProps {
  field: Field
  errors?: Record<string, FieldError | undefined>
  isEditing?: boolean,
  onValueChange?: (field: Field, value: string) => void
}


function FieldHeader({label, required = false, isValid}: {label: string, required?: boolean, isValid?: boolean}) {

  return (
    <div className="flex items-center justify-between w-full px-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center">
        <CircleSmall 
          className="h-4 w-4 mr-1" 
          fill={isValid ? "#22C55E" : required ? "#EF4444" : "#CBD5E1"} 
          strokeWidth={0}
        />
        <span className="flex items-center text-slate-700 text-xs">
          {required ? isValid ? "Complete" : "Required" : "Optional"}
        </span>
      </div>
    </div>
  )
}

function FieldRender({ inputField, isEditing, parentField, onValueChange }: { inputField: Field; isEditing: boolean; parentField?: Field; onValueChange?: (field: Field, value: string) => void }) {
  // Create the input element based on field type
  const renderInput = () => {
    switch (inputField.type) {
    case "textarea":
      return <TextareaField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    case "radio":
      return <RadioField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    case "select":
      return <SelectField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    case "date":
      return <DateField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    case "currency":
      return <CurrencyField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    case "group":
      return <GroupField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    case "text":
      return <TextField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    default:
      return <DefaultField field={inputField} isEditing={isEditing} onValueChange={onValueChange} />
    }
  }

  if (
    inputField.show_if &&
    parentField &&
    parentField.value !== undefined &&
    parentField.name === inputField.show_if?.field &&
    parentField.value !== inputField.show_if?.value) {
    return <></>
  }
  
  // Return the input wrapped in a div with appropriate width class
  return (
    <div className={`${inputField.width === "half" ? "w-1/2 inline-block" : "w-full"} px-2 pt-1.5`}>
      {renderInput()}
    </div>
  )  
}

// Import the OrganisationManagementLayout component
import { DataTableLayout } from "./custom-layouts/data-table"

function FormLayout({ inputField, isEditing = false, onValueChange }: { inputField: Field; isEditing: boolean; onValueChange?: (field: Field, value: string) => void }) {
  switch (inputField.layout) {
    case "data-table":
      return <DataTableLayout inputField={inputField}  />
    default:
      return (
      <>
        <FieldHeader label={inputField.label} required={inputField.required} isValid={inputField.isValid} />
        <div className="text-sm mt-1 p-2 text-slate-700">
          {inputField.type !== "group" && <FieldRender inputField={inputField} isEditing={isEditing} onValueChange={onValueChange} />}
          {inputField.fields && inputField.fields.length > 0 && (
            <div className="flex flex-wrap -mr-2">
              {inputField.fields.map((subfield) => (
                <FieldRender
                  key={subfield.name}
                  inputField={subfield}
                  isEditing={isEditing}
                  parentField={inputField}
                  onValueChange={onValueChange}
                />
              ))}
            </div>
          )}
        </div>
      </>
    )
  }
}

export function FormField({ field, isEditing = false, onValueChange }: FormFieldProps) {
  return (
    <div key={field.name}>
      <FormLayout inputField={field} isEditing={isEditing} onValueChange={onValueChange} />
    </div>
  )
}
