"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio"
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
  radio: (props: FormFieldProps) => {
    const { onChange } = props.register(props.field.name);
    return (
      <RadioGroup
        defaultValue={props.defaultValue?.toString()}
        onValueChange={(value: string) => onChange({ target: { value } })}
        className="flex flex-col space-y-2"
      >
        {props.field.options?.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${props.field.name}-${option.value}`} />
            <label htmlFor={`${props.field.name}-${option.value}`} className="text-sm">
              {option.label}
            </label>
          </div>
        ))}
      </RadioGroup>
    )
  },
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
