"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CircleSmall, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormField } from "@/components/form-templates/form-field"
import { Section, Field, FormData, DependsOnRule } from "@/types/forms"
import { useFormValuesStore } from "@/components/form-templates/form-values-context"

interface FormAccordionItemProps {
  sectionIndex: number
  sectionData: Section
  isEditing: boolean
  defaultValues?: FormData
  formId?: number | string
  lda_id?: number
  userRole?: string
  formStatus?: string
  dataChanged?: (ldaId?: number, applicationId?: string | number) => Promise<void>
  onSectionStatusChange?: (status: { isValid: boolean; completed: number; required: number }) => void
}


export default function FormAccordionItem({
  sectionIndex,
  sectionData,
  isEditing,
  defaultValues,
  formId,
  lda_id,
  userRole,
  formStatus,
  dataChanged,
  onSectionStatusChange,
}: FormAccordionItemProps) {
  const formValuesStore = useFormValuesStore();

  // Check if section is visible to current user role
  const isSectionVisible = useMemo(() => {
    // If visible_to doesn't exist, section is visible to everyone
    if (!sectionData.visible_to) return true;
    
    // If visible_to is an empty array, section is visible to no one
    if (sectionData.visible_to.length === 0) return false;
    
    // If user has no role, hide restricted sections
    if (!userRole) return false;
    
    // Check if user's role is in the visible_to array
    return sectionData.visible_to.includes(userRole);
  }, [sectionData.visible_to, userRole]);

  const isValueValid = (value: string, field: Field) => {
    if (field.type === "fileUpload") {
      if (!value || value.trim() === "") return false;
      try {
        return JSON.parse(value).length > 0;
      } catch {
        return false;
      }
    }
    return value.trim() !== "";
  }

  const createFieldFromTemplate = (field: Field, index: number) => {
    const fields = [...(field?.template || [])];
    return fields.map((templateField: Field) => {
      let show_if;
      if (templateField.show_if){
        show_if = {...templateField.show_if};
        show_if.field = `${field.name}_${templateField.show_if.field}_${index+1}`;
      }

      return {
        ...templateField,
        name: `${field.name}_${templateField.name}_${index+1}`,
        groupIndex: index + 1,
        show_if
      };
    });
  };

  // Prepare fields with default values
  const fieldsWithDefaults = useMemo(() => {
    return sectionData.fields.map((field, fieldIndex) => {
      // Check if field should be shown based on show_if condition
      // Preserve explicit show: false from JSON config
      let show = field.show !== false;
      if (field.show_if) {
        const { field: conditionField, value: conditionValue, show_by_default } = field.show_if;
        const hasValue = defaultValues && (conditionField in defaultValues);
        if (hasValue) {
          // If the condition field has a saved value, evaluate normally
          show = String(defaultValues![conditionField]) === conditionValue;
        } else {
          // No saved value yet: hide unless show_by_default is true
          show = show_by_default === true;
        }
      }

      // Create a base field object with default validity
      // Add isLast property to the field object to check if it is the last field
      let fieldObj = {
        ...field,
        show,
        isValid: field.required ? false : true,
        isLast: fieldIndex === sectionData.fields.length - 1
      };

      // If field has depends_on, compute initial options based on defaultValues
      if (field.depends_on && defaultValues) {
        const dependentFieldValue = defaultValues[field.depends_on.field];
        if (dependentFieldValue) {
          const matchingRule = field.depends_on.rules?.find(
            (rule: DependsOnRule) => rule.when === String(dependentFieldValue)
          );
          if (matchingRule?.options) {
            fieldObj = { ...fieldObj, options: matchingRule.options };
          } else if (field.depends_on.default_options) {
            fieldObj = { ...fieldObj, options: field.depends_on.default_options };
          }
          if (matchingRule?.label) {
            fieldObj = { ...fieldObj, label: matchingRule.label };
          }
        }
      }

      // Check if default value exists for this field
      if (defaultValues && field.name in defaultValues) {
        let value;
        if (typeof defaultValues[field.name] === "object") {
          value = JSON.stringify(defaultValues[field.name]);
        } else {
          value = String(defaultValues[field.name]);
        }

        // A field is valid if it has a value (for required fields) or is optional
        const isValid = field.required ? isValueValid(value, field) : true;
        fieldObj = { ...fieldObj, value, isValid };
      }

      if (field.layout === "repeatable" || field.layout === "narrative-repeatable" || field.layout === "challenges" || field.layout === "partnerships") {
        // Parse indices - handle both array format [1,3,4] and old count format (number)
        let indices: number[] = [];
        try {
          const parsed = fieldObj.value ? JSON.parse(fieldObj.value) : [];
          if (Array.isArray(parsed)) {
            indices = parsed;
          } else if (typeof parsed === "number") {
            // Convert old count format to indices array [1, 2, 3, ...]
            indices = parsed > 0 ? Array.from({ length: parsed }, (_, i) => i + 1) : [];
          }
        } catch {
          indices = []; // Default to empty
        }
        
        // Create fields for each index
        const repeatableFields: Field[] = [];
        indices.forEach((idx) => {
          repeatableFields.push(...createFieldFromTemplate(field, idx - 1)); // idx-1 because createFieldFromTemplate adds 1
        });
        field.fields = repeatableFields.flat();
        fieldObj = { ...fieldObj, value: JSON.stringify(indices) };
      }

      // For casework-categories, data-grid, finalised-cases, garden-beneficiaries, and garden-yields layouts, populate fields from defaultValues
      if ((field.layout === "casework-categories" || field.layout === "data-grid" || field.layout === "finalised-cases" || field.layout === "garden-beneficiaries" || field.layout === "garden-yields") && defaultValues) {
        const fieldPrefix = field.name + '_';
        const dynamicFields: Field[] = [];
        
        // Get source field prefix if this layout links to another field (e.g., garden-beneficiaries links to community_gardens)
        const sourceFieldPrefix = field.config?.sourceField ? String(field.config.sourceField) + '_' : null;
        
        Object.keys(defaultValues).forEach(key => {
          // Include fields that match this field's prefix OR the source field's prefix
          if (key.startsWith(fieldPrefix) || (sourceFieldPrefix && key.startsWith(sourceFieldPrefix))) {
            dynamicFields.push({
              name: key,
              type: 'text',
              label: '',
              value: String(defaultValues[key]),
              show: true,
              isValid: true
            });
          }
        });
        
        if (dynamicFields.length > 0) {
          field.fields = dynamicFields;
          fieldObj = { ...fieldObj, fields: dynamicFields };
        }
        // Skip normal subfield processing for these layouts - fields already have correct names
        return fieldObj;
      }

      // Process subfields if they exist
      if (field.fields) {
        const isRepeatableLayout = field.layout === "repeatable" || field.layout === "narrative-repeatable" || field.layout === "challenges" || field.layout === "partnerships";
        const subFields = field.fields.map((subfield) => {
          // Repeatable fields already have full prefixed names from createFieldFromTemplate
          const subfieldName = isRepeatableLayout ? subfield.name : field.name + '_' + subfield.name;
          let show_subfield = subfield.show !== false;
          if (subfield.show_if !== undefined) {
            const { field: conditionField, value: conditionValue, show_by_default } = subfield.show_if;
            const hasValue = defaultValues && (conditionField in defaultValues);
            if (hasValue) {
              show_subfield = String(defaultValues![conditionField]) === conditionValue;
            } else {
              show_subfield = show_by_default === true;
            }
          }
          let subFieldObj = {
            ...subfield,
            name: subfieldName,
            show: show_subfield,
            isValid: subfield.required && show_subfield ? false : true
          };

          if (defaultValues && subfieldName in defaultValues) {
            const value = String(defaultValues[subfieldName]);
            // A field is valid if it has a value (for required fields) or is optional
            const isValid = subfield.required ? isValueValid(value, subfield) : true;
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

  const flattenVisibleRepeatableFields = (fields: Field[]): Field[] =>
    fields.flatMap(field => {
      // Handle repeatable fields
      if (field.type === "repeatable" && field.show) {
        return [
          field,
          ...(field.fields?.filter(f => f.show) ?? [])
        ]
      }
      // Handle custom layout fields (casework-categories, finalised-cases, garden-beneficiaries, garden-yields, data-grid)
      if (field.layout && ['casework-categories', 'finalised-cases', 'garden-beneficiaries', 'garden-yields', 'data-grid', 'finance-totals'].includes(field.layout) && field.show) {
        return [
          field,
          ...(field.fields?.filter(f => f.show) ?? [])
        ]
      }
      return field.show ? [field] : []
    })

  // Calculate initial completion status
  const calculateCompletionStatus = useCallback((fields: Field[]) => {
    let completed = 0;
    // Count completed required fields
    const visibleFields = flattenVisibleRepeatableFields(fields);
    visibleFields.forEach((field: Field) => {
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
    const requiredCount = visibleFields.filter(field => field.required && field.show).length;
    
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

  // Check if this section should always be editable for the current user
  // (sections with editable_by that includes the user's role should be editable when form is UnderReview)
  const isAlwaysEditableForUser = useMemo(() => {
    if (!sectionData.editable_by || sectionData.editable_by.length === 0) return false;
    if (!userRole) return false;
    // Only allow editing when form is UnderReview
    if (formStatus !== 'UnderReview') return false;
    return sectionData.editable_by.includes(userRole);
  }, [sectionData.editable_by, userRole, formStatus]);

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

  // Check if section has any status fields and get their completion state
  // Use section.fields to react to updates from custom layouts
  const statusFieldsState = useMemo(() => {
    const fields = section?.fields || fieldsWithDefaults;
    // Find all fields that end with _status and check their values
    const statusFields = fields.filter((f: Field) => f.name.endsWith('_status'));
    if (statusFields.length === 0) return null;
    
    const hasIncomplete = statusFields.some((f: Field) => f.value === 'incomplete');
    const hasComplete = statusFields.some((f: Field) => f.value === 'complete');
    
    // If we have status fields, use them to determine completion
    return {
      hasStatusFields: true,
      isComplete: !hasIncomplete && hasComplete,
      isIncomplete: hasIncomplete
    };
  }, [section?.fields, fieldsWithDefaults]);

  // Use ref to track previous state to prevent unnecessary updates
  const prevSectionRef = useRef<{
    isValid: boolean;
    completed: number;
    required: number;
  } | null>(null);

  // Notify parent component when section status changes
  useEffect(() => {

    if (!onSectionStatusChange || !section) return;

    // Determine effective isValid - use status fields if available
    const effectiveIsValid = statusFieldsState?.hasStatusFields 
      ? statusFieldsState.isComplete 
      : section.isValid;

    // Only update if values have changed
    const prevSection = prevSectionRef.current;
    if (
      !prevSection ||
      prevSection.isValid !== effectiveIsValid ||
      prevSection.completed !== section.completed ||
      prevSection.required !== section.required
    ) {
      // Update the ref with current values
      prevSectionRef.current = {
        isValid: effectiveIsValid,
        completed: section.completed,
        required: section.required
      };
      
      // Notify parent with effective validity
      onSectionStatusChange({
        isValid: effectiveIsValid,
        completed: section.completed,
        required: section.required
      });
    }
  }, [section?.isValid, section?.completed, section?.required, onSectionStatusChange, section, statusFieldsState]);

  // Batch save: accumulate pending field changes and flush them in a single API call
  type SaveFieldFunction = (fieldName: string, fieldValue: string) => Promise<void>;
  const debouncedSaveRef = useRef<SaveFieldFunction | null>(null);
  const pendingFieldsRef = useRef<Record<string, string>>({});
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize the batched save function
  useEffect(() => {
    // Flush all pending fields to the API in a single request
    const flushPendingFields = async (): Promise<void> => {
      if (!formId) return;
      
      const fieldsToSave = { ...pendingFieldsRef.current };
      pendingFieldsRef.current = {};
      
      if (Object.keys(fieldsToSave).length === 0) return;
      
      try {
        const response = await fetch(`/api/lda-form/${formId}/field`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fieldsToSave })
        });
        
        if (!response.ok) {
          console.error('Failed to save fields:', await response.json());
        }
        dataChanged?.(lda_id, formId);
      } catch (error) {
        console.error('Error saving fields:', error);
      }
    };
    
    // Queue a field change and schedule a flush
    const debouncedSave: SaveFieldFunction = (fieldName: string, fieldValue: string) => {
      // Add/update this field in the pending batch
      pendingFieldsRef.current[fieldName] = fieldValue;
      
      // Reset the flush timer — all changes within 500ms get batched together
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      
      return new Promise<void>((resolve) => {
        flushTimeoutRef.current = setTimeout(async () => {
          flushTimeoutRef.current = null;
          await flushPendingFields();
          resolve();
        }, 500);
      });
    };

    debouncedSaveRef.current = debouncedSave;
  }, [formId, dataChanged, lda_id]);

  const onChange = useCallback((field: Field, value: string) => {
    // If section is not editable by this user, don't allow changes
    if (!isSectionEditable) return;
    
    // Update local state
    setSection((prev) => {
      const updatedSection = { ...prev };
      
      // Update the field with new value and validate it
      updatedSection.fields = updatedSection.fields.map((f: Field) => {

        // if field type repeatable or has repeatable layout, add or remove fields based on the value index
        if ((f.type === "repeatable" || f.layout === "partnerships") && f.name === field.name) {
          // Check if this is a delete specific index command (format: "delete:INDEX")
          if (value.startsWith("delete:")) {
            const deleteIndex = parseInt(value.split(":")[1]);
            
            // Clear values for deleted fields in DB
            const removedFields = (f?.fields || []).filter((field) => field?.groupIndex === deleteIndex);
            removedFields.forEach((field) => {
              if (debouncedSaveRef.current) {
                debouncedSaveRef.current(field.name, "");
              }
            });
            
            // Filter out deleted fields - keep original indices (no reindexing needed)
            const remainingFields = (f?.fields || []).filter((field) => field?.groupIndex !== deleteIndex);
            
            // Get remaining indices as sorted array (e.g., [1, 3, 4] if we deleted 2)
            const remainingIndices = Array.from(
              new Set(remainingFields.map(field => field.groupIndex).filter(Boolean))
            ).sort((a, b) => (a as number) - (b as number));
            
            f.fields = remainingFields;
            // Store indices array instead of count (e.g., "[1,3,4]" instead of "3")
            f = { ...f, value: JSON.stringify(remainingIndices) };
            
            // Save the indices array to DB
            if (debouncedSaveRef.current) {
              debouncedSaveRef.current(f.name, JSON.stringify(remainingIndices));
            }
          } else {
            // Adding new item - parse current indices array or convert from old count format
            let currentIndices: number[] = [];
            try {
              const parsed = JSON.parse(f?.value || "[]");
              if (Array.isArray(parsed)) {
                currentIndices = parsed;
              } else if (typeof parsed === "number") {
                // Convert old count format to indices array
                currentIndices = Array.from({ length: parsed }, (_, i) => i + 1);
              }
            } catch {
              // Get indices from existing fields
              currentIndices = Array.from(
                new Set((f?.fields || []).map(field => field.groupIndex).filter(Boolean))
              ) as number[];
            }
            
            // Find the next available index (max + 1)
            const maxIndex = currentIndices.length > 0 ? Math.max(...currentIndices) : 0;
            const newIndex = maxIndex + 1;
            
            // Create new fields from template (already includes parent prefix in name)
            const newFields = createFieldFromTemplate(f, newIndex - 1); // -1 because createFieldFromTemplate adds 1
            const subFields = newFields.flat().map((subfield) => {
              // Respect show: false from template, otherwise check show_if
              const showField = subfield.show === false ? false : (subfield.show_if ? false : true);
              const subFieldObj = {
                ...subfield,
                show: showField,
                isValid: subfield.required ? false : true
              };
              return subFieldObj;
            });
            
            // Add new index to array and update fields
            const newIndices = [...currentIndices, newIndex].sort((a, b) => a - b);
            f.fields = [...(f.fields || []), ...subFields];
            f = { ...f, value: JSON.stringify(newIndices) };
            
            // Save the new indices array to DB
            if (debouncedSaveRef.current) {
              debouncedSaveRef.current(f.name, JSON.stringify(newIndices));
            }
          }
        }

        // If the field is a show_if field, update its visibility according to current field response
        if (f?.show_if !== undefined) {
          if (f.show_if.field === field.name) {
            f = { ...f, show: value === f?.show_if?.value };
          }
        }

        // If the field has depends_on and depends on the changed field, update options and clear value
        if (f?.depends_on && f.depends_on.field === field.name) {
          // Find matching rule for the new value
          const matchingRule = f.depends_on.rules?.find((rule: DependsOnRule) => rule.when === value);
          const newOptions = matchingRule?.options || f.depends_on.default_options || f.options;
          const matchingRuleLabel = matchingRule?.label || f.label;
          // Clear the field value and update options
          f = { ...f, options: newOptions, value: "", isValid: f.required ? false : true, label: matchingRuleLabel };
          // Save the cleared value to API after a delay to not interfere with the original field save
          const dependentFieldName = f.name;
          setTimeout(() => {
            if (debouncedSaveRef.current) {
              debouncedSaveRef.current(dependentFieldName, "");
            }
          }, 600);
        }

        if (f.fields) {
          f.fields = f.fields.map((subfield: Field) => {
            if (subfield.name === field.name) {
              // A field is valid if it has a value (for required fields) or is optional
              const isFieldValid = subfield.required ? Boolean(value.trim().length > 0) : true;
              subfield = { ...subfield, value, isValid: isFieldValid };
            }

            // If the subfield is a show_if field, update its visibility according to current field response
            if (subfield?.show_if !== undefined) {
              if (subfield.show_if.field === field.name) {
                subfield = { ...subfield, show: value === subfield?.show_if?.value };
              }
            }

            // If the subfield has depends_on and depends on the changed field, update options and clear value
            if (subfield?.depends_on && subfield.depends_on.field === field.name) {
              const matchingRule = subfield.depends_on.rules?.find((rule: DependsOnRule) => rule.when === value);
              const newOptions = matchingRule?.options || subfield.depends_on.default_options || subfield.options;
              subfield = { ...subfield, options: newOptions, value: "", isValid: subfield.required ? false : true };
              
              // Save the cleared value to API after a delay to not interfere with the original field save
              const dependentSubfieldName = subfield.name;
              setTimeout(() => {
                if (debouncedSaveRef.current) {
                  debouncedSaveRef.current(dependentSubfieldName, "");
                }
              }, 600);
            }
            return subfield;
          }) as Field[];
        }

        // Update the field with new value and validate it
        if (f.name === field.name) {
          f =  { ...f, value, isValid: f.required ? Boolean(value.trim().length > 0) : true };
        }
        let isFieldValid = f.isValid;
        if (f.fields) {
          isFieldValid = f.fields.every((subfield: Field) => subfield.show && subfield.required ? subfield.isValid : true);
        }

        
        return { ...f, isValid: isFieldValid };
      }) as Field[];
      
      // Recalculate completion status
      const status = calculateCompletionStatus(updatedSection.fields);
      updatedSection.completed = status.completed;
      updatedSection.required = status.required;
      updatedSection.isValid = status.isValid;
      
      return updatedSection;
    });
    
    // Update shared form values store for cross-section reactivity
    if (formValuesStore) {
      formValuesStore.set(field.name, value);
    }

    // Save the field value to the API with debouncing
    if (debouncedSaveRef.current && formId) {
      debouncedSaveRef.current(field.name, value);
    }
  }, [calculateCompletionStatus, formId, isSectionEditable, formValuesStore])

  // Don't render section if not visible to current user
  if (!isSectionVisible) return null;

  return (
    <AccordionItem 
      value={`section-${sectionIndex}`}
      className="border-b overflow-hidden text-gray-400"
    >
      <AccordionTrigger 
        className={cn(
          "px-4 hover:no-underline",
          // Use status fields if available, otherwise use standard isValid
          statusFieldsState?.hasStatusFields
            ? (statusFieldsState.isComplete ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950")
            : (section?.isValid ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950")
        )}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            {section.tag && (
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">
                {section.tag}
              </span>
            )}
            <span className="text-md font-semibold text-slate-900">{section.title}</span>
          </div>
          <div className="flex items-center space-x-2 px-2">
            <CircleSmall 
              className="h-4 w-4 mr-1" 
              fill={statusFieldsState?.hasStatusFields
                ? (statusFieldsState.isComplete ? "#22C55E" : "#EF4444")
                : (section?.isValid ? "#22C55E" : "#EF4444")} 
              strokeWidth={0}
            />
            <span className="flex items-center text-slate-700 text-xs">
              {statusFieldsState?.hasStatusFields
                ? (statusFieldsState.isComplete ? "Complete" : "Incomplete")
                : `${section?.completed}/${section?.required} Required`}
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
          <p className="text-sm text-gray-500 mb-4 px-4">{section?.description}</p>
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
            {section.fields.filter((field) => field.show !== false).map((field) => (
              <FormField
                key={field.name}
                field={field}
                lda_id={lda_id}
                lda_form_id={formId}
                isEditing={(isEditing && isSectionEditable) || isAlwaysEditableForUser}
                onValueChange={onChange}
              />
            ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
