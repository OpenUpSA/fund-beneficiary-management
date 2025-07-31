"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CircleSmall, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormField } from "@/components/form-templates/form-field"
import { Section, Field, FormData } from "@/types/forms"

interface FormAccordionItemProps {
  sectionIndex: number
  sectionData: Section
  isEditing: boolean
  defaultValues?: FormData
  formId?: number | string
  userRole?: string
  onSectionStatusChange?: (status: { isValid: boolean; completed: number; required: number }) => void
}


export default function FormAccordionItem({
  sectionIndex,
  sectionData,
  isEditing,
  defaultValues,
  formId,
  userRole,
  onSectionStatusChange,
}: FormAccordionItemProps) {
  // Prepare fields with default values
  const fieldsWithDefaults = useMemo(() => {
    return sectionData.fields.map(field => {
      // Create a base field object with default validity
      let fieldObj = { 
        ...field, 
        isValid: field.required ? false : true 
      };
      
      // Check if default value exists for this field
      if (defaultValues && field.name in defaultValues) {
        let value;
        if (typeof defaultValues[field.name] === "object") {
          value = JSON.stringify(defaultValues[field.name]);
        } else {
          value = String(defaultValues[field.name]);
        }

        // A field is valid if it has a value (for required fields) or is optional
        const isValid = field.required ? Boolean(value && value.trim() !== "") : true;
        fieldObj = { ...fieldObj, value, isValid };
      }

      // Process subfields if they exist
      if (field.fields) {
        const subFields = field.fields.map((subfield) => {
          const subfieldName = field.name + '_' + subfield.name;
          let subFieldObj = { 
            ...subfield, 
            name: subfieldName,
            isValid: subfield.required ? false : true 
          };
          
          if (defaultValues && subfieldName in defaultValues) {
            const value = String(defaultValues[subfieldName]);
            // A field is valid if it has a value (for required fields) or is optional
            const isValid = subfield.required ? Boolean(value && value.trim() !== "") : true;
            subFieldObj = { ...subFieldObj, value, isValid };
          }
          return subFieldObj;
        });
        
        // For a field with subfields, check if all required subfields are valid
        const requiredSubfields = subFields.filter(sf => sf.required);
        const allRequiredSubfieldsValid = requiredSubfields.length > 0 ? 
          requiredSubfields.every(sf => sf.isValid) : true;
        
        // Update the parent field's validity based on its subfields
        fieldObj = { 
          ...fieldObj, 
          fields: subFields,
          isValid: field.required ? allRequiredSubfieldsValid : true
        };
      }
      
      return fieldObj;
    }) as Field[];
  }, [sectionData.fields, defaultValues]);

  // Calculate initial completion status
  const calculateCompletionStatus = useCallback((fields: Field[]) => {
    let completed = 0;
    
    // Count completed required fields
    fields.forEach((field: Field) => {
      // A field is completed if it has a value and is valid
      if (field.required && field.isValid) {
        completed++;
      }
      
      // Update isValid property if it's not already set
      if (field.isValid === undefined) {
        // Set isValid to a boolean value
        if (field.required) {
          field.isValid = Boolean(field.value && field.value.trim() !== "");
        } else {
          field.isValid = true;
        }
      }
    });
    
    // Count required fields
    const requiredCount = fields.filter(field => field.required).length;
    
    // Section is valid if all required fields are completed
    const isValid = requiredCount > 0 ? completed === requiredCount : true;
    
    return { completed, required: requiredCount, isValid };
  }, []);

  // Determine if the section is editable based on user role and section permissions
  const isSectionEditable = useMemo(() => {
    // If editable_by doesn't exist, section is editable by anyone
    if (!sectionData.editable_by) return true;
    
    // If editable_by is an empty array, section is editable by no one
    if (sectionData.editable_by.length === 0) return false;
    
    // If user has no role or section requires specific roles
    if (!userRole) return false;
    
    // Check if user's role is in the editable_by array
    return sectionData.editable_by.includes(userRole);
  }, [sectionData.editable_by, userRole]);

  // Track section completion status
  const [section, setSection] = useState(() => {
    const status = calculateCompletionStatus(fieldsWithDefaults);
    return {
      ...sectionData,
      fields: fieldsWithDefaults,
      isValid: status.isValid,
      required: status.required,
      completed: status.completed
    };
  });

  // Use ref to track previous state to prevent unnecessary updates
  const prevSectionRef = useRef<{
    isValid: boolean;
    completed: number;
    required: number;
  } | null>(null);

  // Notify parent component when section status changes
  useEffect(() => {
    if (!onSectionStatusChange || !section) return;

    // Only update if values have changed
    const prevSection = prevSectionRef.current;
    if (
      !prevSection ||
      prevSection.isValid !== section.isValid ||
      prevSection.completed !== section.completed ||
      prevSection.required !== section.required
    ) {
      // Update the ref with current values
      prevSectionRef.current = {
        isValid: section.isValid,
        completed: section.completed,
        required: section.required
      };
      
      // Notify parent
      onSectionStatusChange({
        isValid: section.isValid,
        completed: section.completed,
        required: section.required
      });
    }
  }, [section?.isValid, section?.completed, section?.required, onSectionStatusChange, section]);

  // Create a ref to store the debounced function to prevent recreation on every render
  type SaveFieldFunction = (fieldName: string, fieldValue: string) => Promise<void>;
  const debouncedSaveRef = useRef<SaveFieldFunction | null>(null);
  
  // Initialize the debounced save function
  useEffect(() => {
    // Define the function that will actually save the data
    const saveFieldData = async (fieldName: string, fieldValue: string): Promise<void> => {
      if (formId) {
        try {
          const response = await fetch(`/api/lda-form/${formId}/field`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldName, fieldValue })
          });
          
          if (!response.ok) {
            console.error('Failed to save field:', await response.json());
          }
        } catch (error) {
          console.error('Error saving field:', error);
        }
      }
    };
    
    // Debounce function to limit how often the API calls are made
    function debounce(func: SaveFieldFunction, delay: number): SaveFieldFunction {
      let timeoutId: NodeJS.Timeout;
      return (fieldName: string, fieldValue: string) => {
        clearTimeout(timeoutId);
        return new Promise<void>((resolve) => {
          timeoutId = setTimeout(async () => {
            await func(fieldName, fieldValue);
            resolve();
          }, delay);
        });
      };
    }

    // Create the debounced version of saveFieldData
    debouncedSaveRef.current = debounce(saveFieldData, 500); // 500ms debounce delay
  }, [formId]);

  const onChange = useCallback((field: Field, value: string) => {
    // If section is not editable by this user, don't allow changes
    if (!isSectionEditable) return;
    
    // Update local state
    setSection((prev) => {
      const updatedSection = { ...prev };
      
      // Update the field with new value and validate it
      updatedSection.fields = updatedSection.fields.map((f: Field) => {
        if (f.name === field.name) {
          // A field is valid if it has a value (for required fields) or is optional
          const isFieldValid = f.required ? Boolean(value.trim().length > 0) : true;
          return { ...f, value, isValid: isFieldValid };
        }

        if (f.fields) {
          f.fields = f.fields.map((subfield: Field) => {
            if (subfield.name === field.name) {
              // A field is valid if it has a value (for required fields) or is optional
              const isFieldValid = subfield.required ? Boolean(value.trim().length > 0) : true;
              return { ...subfield, value, isValid: isFieldValid };
            }
            return subfield;
          }) as Field[];
        }

        return f;
      }) as Field[];
      
      // Recalculate completion status
      const status = calculateCompletionStatus(updatedSection.fields);
      updatedSection.completed = status.completed;
      updatedSection.isValid = status.isValid;
      
      return updatedSection;
    });
    
    // Save the field value to the API with debouncing
    if (debouncedSaveRef.current && formId) {
      debouncedSaveRef.current(field.name, value);
    }
  }, [calculateCompletionStatus, formId, isSectionEditable])

  return (
    <AccordionItem 
      value={`section-${sectionIndex}`}
      className="border-b overflow-hidden text-gray-400"
    >
      <AccordionTrigger 
        className={cn(
          "px-4 hover:no-underline",
          section?.isValid ? "bg-green-50 dark:bg-green-950" : 
          !section?.isValid ? "bg-red-50 dark:bg-red-950" :
          "bg-white dark:bg-gray-900"
        )}
      >
        <div className="flex justify-between items-center w-full">
            <span className="text-md font-semibold text-slate-900">{section.title}</span>
          <div className="flex items-center space-x-2 px-2">
            <CircleSmall 
              className="h-4 w-4 mr-1" 
              fill={section?.isValid ? "#22C55E" : "#EF4444"} 
              strokeWidth={0}
            />
            <span className="flex items-center text-slate-700 text-xs">
              {section?.completed}/{section?.required} Required
            </span>
            {!isSectionEditable && (
              <span className="flex items-center text-slate-700">
                <Lock className="h-3 w-3 mr-1" strokeWidth={3}/>
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pt-4 pb-4 bg-white dark:bg-gray-950">
        {section?.description && (
          <p className="text-sm text-gray-500 mb-4">{section?.description}</p>
        )}
        {section?.notice && (
          <div className="mb-4 px-2">
            <div className="flex">
              <div className="ml-3 bg-slate-100 p-2 rounded px-2">
                <p className="text-sm text-slate-500">
                  <span className="font-medium">Important:</span> <span className="font-normal">{section.notice}</span>
                </p>
              </div>
            </div>
          </div>
        )}
            <div className="space-y-4">
            {section.fields.map((field) => (
              <FormField
                  field={field}
                  key={field.name}
                  isEditing={isEditing && isSectionEditable}
                  onValueChange={onChange}
              />
            ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
