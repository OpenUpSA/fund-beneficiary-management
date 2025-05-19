"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/datepicker"
import { Field, FormData } from "@/types/forms"
import { FieldError, UseFormRegister } from "react-hook-form"

interface FormFieldProps {
  field: Field
  register: UseFormRegister<FormData>
  error?: FieldError
  defaultValue?: string | number
}

const fieldComponents = {
  textarea: (props: FormFieldProps) => (
    <Textarea
      {...props.register(props.field.name)}
      className={props.error ? "border-red-500" : ""}
      rows={8}
    />
  ),
  datepicker: (props: FormFieldProps) => (
    <DatePicker
      {...props.register(props.field.name)}
      className={props.error ? "border-red-500" : ""}
      date={props.defaultValue ? new Date(props.defaultValue) : undefined}
      onDateChange={(date) => {
        const event = {
          target: {
            name: props.field.name,
            value: date ? date.toISOString() : ""
          }
        }
        props.register(props.field.name).onChange(event)
      }}
    />
  ),
  default: (props: FormFieldProps) => (
    <Input
      type={props.field.type}
      {...props.register(props.field.name)}
      className={props.error ? "border-red-500" : ""}
    />
  )
}

export function FormField(props: FormFieldProps) {
  const Component = fieldComponents[props.field.type as keyof typeof fieldComponents] || fieldComponents.default
  
  return (
    <div>
      <label className="block text-sm font-medium">
        {props.field.label}
        {props.field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {Component(props)}
      {props.error && (
        <p className="text-red-500 text-sm">
          {props.error.message || "An error occurred"}
        </p>
      )}
    </div>
  )
}
