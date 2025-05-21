"use client"

import { useEffect, useState } from "react"
import { useForm, FieldError } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormField } from "@/components/form-templates/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { z, ZodObject, ZodRawShape } from "zod"
import { Field, FieldType, Form, Section, FormData, validTypes } from "@/types/forms"

function createZodSchema(form: Form) {
  const schema: Record<string, z.ZodTypeAny> = {}

  form.sections.forEach((section: Section) => {
    section.fields.forEach((field: Field) => {
      let fieldSchema: z.ZodTypeAny

      if (field.type === "number") {
        fieldSchema = z.preprocess((val) => {
          if (typeof val === "string") {
            const numberVal = parseFloat(val)
            if (isNaN(numberVal)) {
              return undefined
            }
            return numberVal
          }
          return val
        }, z.number())
      } else if (field.type === "email") {
        fieldSchema = z.string().email("Invalid email format")
      } else {
        fieldSchema = z.string()
      }

      if (field.required) {
        if (fieldSchema instanceof z.ZodString) {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`)
        } else if (fieldSchema instanceof z.ZodNumber) {
          fieldSchema = fieldSchema.refine((val) => val !== undefined, {
            message: `${field.label} is required`,
          })
        }
      }

      if (field.min !== undefined) {
        if (fieldSchema instanceof z.ZodString || fieldSchema instanceof z.ZodNumber) {
          fieldSchema = fieldSchema.min(field.min, `${field.label} must be at least ${field.min}`)
        }
      }

      schema[field.name] = fieldSchema
    })
  })

  return z.object(schema)
}

type FormTemplate = {
  id: number
  name: string
  description: string
  form: Form
}

function sanitizeForm(formTemplate: FormTemplate["form"]): Form {
  return {
    title: formTemplate.title,
    sections: formTemplate.sections.map((section) => ({
      title: section.title,
      fields: section.fields.map((field) => ({
        ...field,
        type: validTypes.includes(field.type as FieldType) ? (field.type as FieldType) : "string",
      })),
    })),
  }
}

export default function DynamicForm({
  form,
  setData,
  saveData,
  defaultValues = {},
}: {
  form: FormTemplate["form"]
  setData?: React.Dispatch<React.SetStateAction<FormData>>
  saveData?: (data: FormData) => void
  defaultValues?: FormData
}) {
  const [validationSchema, setValidationSchema] = useState<ZodObject<ZodRawShape> | null>(null)

  useEffect(() => {
    const sanitizedForm = sanitizeForm(form)
    const schema = createZodSchema(sanitizedForm)
    setValidationSchema(schema)
  }, [form])

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm({
    resolver: validationSchema ? zodResolver(validationSchema) : undefined,
    defaultValues,
  })

  useEffect(() => {
    const handler = () => {
      handleSubmit(onSubmit)()
    }
    window.addEventListener("submit-dynamic-form", handler)
    return () => window.removeEventListener("submit-dynamic-form", handler)
  }, [handleSubmit])

  const onSubmit = (data: Record<string, string>) => {
    if (setData) {
      setData(data)
    }
    if (saveData) {
      saveData(data)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h1 className="text-2xl font-bold">{form.title}</h1>

      {form.sections.map((section, sectionIndex) => (
        <Card key={sectionIndex} className="p-4">
          <CardHeader className="text-lg font-semibold">{section.title}</CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                register={register}
                errors={formErrors as Record<string, FieldError | undefined>}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {!saveData && <Button className="bg-white text-black dark:bg-black dark:text-white" type="submit">
        Submit
      </Button>}
    </form>
  )
}
