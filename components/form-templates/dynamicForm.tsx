"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { useForm, FieldError } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormField } from "@/components/form-templates/form-field"
import { Button } from "@/components/ui/button"
import { z, ZodObject, ZodRawShape } from "zod"
import { Field, FieldType, Form, FormData, validTypes } from "@/types/forms"
import type { Section } from "@/types/forms"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CircleSmall, Save } from "lucide-react"
import { cn } from "@/lib/utils"

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
      description: section.description,
      fields: section.fields.map((field) => ({
        ...field,
        type: validTypes.includes(field.type as FieldType) ? (field.type as FieldType) : "string",
      })),
    })),
  }
}

export function DynamicForm({
  form,
  setData,
  saveData,
  isEditing = false,
  defaultValues = {},
  setParentEditing,
  onValidationChange,
}: {
  form: FormTemplate["form"]
  setData?: React.Dispatch<React.SetStateAction<FormData>>
  saveData?: (data: FormData) => void
  defaultValues?: FormData
  isEditing?: boolean
  setParentEditing?: (isEditing: boolean) => void
  onValidationChange?: (isValid: boolean) => void
}) {
  const [validationSchema, setValidationSchema] = useState<ZodObject<ZodRawShape> | null>(null)

  useEffect(() => {
    const sanitizedForm = sanitizeForm(form)
    const schema = createZodSchema(sanitizedForm)
    setValidationSchema(schema)
  }, [form])

  // Force re-render when isEditing changes
  const [editingState, setEditingState] = useState(isEditing);
  
  useEffect(() => {
    setEditingState(isEditing);
  }, [isEditing]);
  
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors: formErrors },
    reset
  } = useForm({
    resolver: validationSchema ? zodResolver(validationSchema) : undefined,
    defaultValues,
  })
  
  // Reset the form with current values when editing state changes
  useEffect(() => {
    if (validationSchema) {
      reset(defaultValues);
    }
  }, [editingState, defaultValues, reset, validationSchema])
  
  // Check form validity when not in editing mode
  useEffect(() => {
    if (!editingState && validationSchema && onValidationChange) {
      // Validate the current form values against the schema
      const result = validationSchema.safeParse(getValues());
      onValidationChange(result.success);
    }
  }, [editingState, validationSchema, getValues, onValidationChange])

  // Function for final submission with validation
  const onSubmit = useCallback((data: Record<string, string>) => {
    if (setData) {
      setData(data)
    }
    if (saveData) {
      saveData(data)
    }
    return data
  }, [setData, saveData])
  
  // Function to validate form
  // const validateForm = useCallback(() => {
  //   if (!validationSchema) return false;
  //   const result = validationSchema.safeParse(getValues());
  //   return result.success;
  // }, [validationSchema, getValues])
  
  // Function to save progress without validation
  const saveProgress = useCallback(() => {
    const currentValues = getValues();
    if (setData) {
      setData(currentValues as FormData);
    }
    if (saveData) {
      saveData(currentValues as FormData);
    }
    // Update parent's editing state
    if (setParentEditing) {
      setParentEditing(false);
    }
    // Update local editing state
    window.location.reload();
    setEditingState(false);
  }, [getValues, setData, saveData, setParentEditing])

  useEffect(() => {
    const handler = () => {
      handleSubmit(onSubmit)()
    }
    window.addEventListener("submit-dynamic-form", handler)
    return () => window.removeEventListener("submit-dynamic-form", handler)
  }, [handleSubmit, onSubmit])

  const getSectionCompletionStatus = useCallback((sectionFields: Form['sections'][0]['fields']) => {
    const totalFields = sectionFields.length;
    if (totalFields === 0) return { completed: 0, required: 0 };

    const requiredFields = sectionFields.filter(field => field.required).length;
    const completedFields = sectionFields.filter(field => {
      return defaultValues[field.name] !== undefined && defaultValues[field.name] !== "";
    }).length;
    
    return { completed: completedFields, required: requiredFields };
  }, [defaultValues]);

  // Determine which sections should be open by default (those not completed)
  const getDefaultOpenSections = useMemo(
    () => {
    return form.sections
      .map((section, index) => {
        const { completed, required } = getSectionCompletionStatus(section.fields);
        // Open the section if it's not fully completed
        return completed < required ? `section-${index}` : null;
      })
      .filter(Boolean) as string[];
    }, [form, getSectionCompletionStatus])

  return (
    <form onSubmit={handleSubmit(onSubmit)}>

      <div className="space-y-2">
        <Accordion type="multiple" defaultValue={getDefaultOpenSections}>
          {form.sections.map((section, sectionIndex) => {
            const { completed, required } = getSectionCompletionStatus(section.fields);
            const isComplete = completed >= required;
          
          return (
            <AccordionItem 
              key={sectionIndex} 
              value={`section-${sectionIndex}`}
              className="border-b overflow-hidden text-gray-400"
            >
              <AccordionTrigger 
                className={cn(
                  "px-4 hover:no-underline",
                  isComplete ? "bg-green-50 dark:bg-green-950" : 
                  !isComplete ? "bg-red-50 dark:bg-red-950" :
                  "bg-white dark:bg-gray-900"
                )}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-md font-semibold text-slate-900">{section.title}</span>
                  <div className="flex items-center space-x-2 px-2">
                    <CircleSmall className="h-4 w-4 mr-1" fill={isComplete ? "#22C55E" : "#EF4444"} strokeWidth={0}/>
                    <span className="flex items-center text-slate-700 text-xs">
                      {completed}/{required} Required
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 pb-4 bg-white dark:bg-gray-950">
                <div className="space-y-4">
                  {section.fields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                      </label>
                      <div className="border p-3 rounded bg-gray-50 dark:bg-gray-900 text-sm mt-1">
                      <FormField
                        key={field.name}
                        field={field}
                        register={register}
                        errors={formErrors as Record<string, FieldError | undefined>}
                        isEditing={editingState}
                      />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
    {saveData && editingState && (
      <div className="flex p-4 shadow-xl">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => {
              setEditingState(false);
              if (setParentEditing) {
                setParentEditing(false);
              }
            }} 
          >
            Discard Changes
          </Button>
          <div className="flex-grow"></div>
          <Button 
            type="button"
            onClick={saveProgress}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </Button>
      </div>
      )}
    </form>
  );
}

export default DynamicForm;
