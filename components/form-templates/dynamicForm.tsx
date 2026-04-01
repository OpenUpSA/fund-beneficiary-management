"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormData } from "@/types/forms"
import { Accordion } from "@/components/ui/accordion"
import FormAccordionItem from "@/components/form-templates/form-accordion-item"
import { FormValuesProvider } from "@/components/form-templates/form-values-context"


type FormTemplate = {
  id: number
  name: string
  description: string
  form: Form
}

export function DynamicForm({
  form,
  setData,
  isEditing = true,
  defaultValues = {},
  setParentEditing,
  formId,
  lda_id,
  userRole,
  formStatus,
  setIsFormValid,
  setCompletionStatus,
  dataChanged,
}: {
  form: FormTemplate["form"]
  setData?: React.Dispatch<React.SetStateAction<FormData>>
  defaultValues?: FormData
  isEditing?: boolean
  setParentEditing?: (isEditing: boolean) => void
  formId?: number | string
  lda_id?: number
  userRole?: string
  formStatus?: string
  setIsFormValid?: (isValid: boolean) => void
  setCompletionStatus?: (status: { completed: number; required: number }) => void
  dataChanged?: (
    ldaId?: number,
    applicationId?: string | number,
    form_template_id?: number | string
  ) => Promise<void>
}) {
  // Force re-render when isEditing changes
  const [editingState, setEditingState] = useState(true);
  
  // Track form data internally - using defaultValues directly
  const formData = defaultValues || {};
  
  // Track section validity states and completion counts
  const [sectionStatusMap, setSectionStatusMap] = useState<Record<number, {
    isValid: boolean;
    completed: number;
    required: number;
  }>>({});

  useEffect(() => {
    setEditingState(isEditing);
  }, [isEditing]);
  
  // Update parent component with form data changes when defaultValues change
  useEffect(() => {
    if (setData) {
      setData(defaultValues);
    }
  }, [defaultValues, setData]);

  // Use refs to track previous values and prevent unnecessary updates
  const prevFormValidRef = useRef<boolean | null>(null);
  const prevCompletionRef = useRef<{ completed: number; required: number } | null>(null);

  // Calculate number of visible sections based on user role
  const visibleSectionsCount = form.sections.filter(section => {
    // If visible_to doesn't exist, section is visible to everyone
    if (!section.visible_to) return true;
    // If visible_to is an empty array, section is visible to no one
    if (section.visible_to.length === 0) return false;
    // If user has no role, hide restricted sections
    if (!userRole) return false;
    // Check if user's role is in the visible_to array
    return section.visible_to.includes(userRole);
  }).length;

  // Update form validity whenever section status changes
  useEffect(() => {
    // Calculate form validity
    if (setIsFormValid) {
      const allSectionsValid = Object.values(sectionStatusMap).every(status => status.isValid);
      const allSectionsTracked = Object.keys(sectionStatusMap).length === visibleSectionsCount;
      const isCurrentlyValid = allSectionsValid && allSectionsTracked;

      // Only update if validity changed
      if (prevFormValidRef.current !== isCurrentlyValid) {
        prevFormValidRef.current = isCurrentlyValid;
        setIsFormValid(isCurrentlyValid);
      }
    }

    // Calculate completion status
    if (setCompletionStatus) {
      const totalCompleted = Object.values(sectionStatusMap).reduce(
        (sum, status) => sum + status.completed, 0
      );
      const totalRequired = Object.values(sectionStatusMap).reduce(
        (sum, status) => sum + status.required, 0
      );

      const currentCompletion = { completed: totalCompleted, required: totalRequired };
      // Only update if completion status changed
      const prevCompletion = prevCompletionRef.current;
      if (!prevCompletion ||
          prevCompletion.completed !== currentCompletion.completed ||
          prevCompletion.required !== currentCompletion.required) {
        prevCompletionRef.current = currentCompletion;
        setCompletionStatus(currentCompletion);
      }
    }
  }, [sectionStatusMap, visibleSectionsCount, setIsFormValid, setCompletionStatus]);

  // Callback to update section status
  const handleSectionStatusChange = useCallback((sectionIndex: number, status: {
    isValid: boolean;
    completed: number;
    required: number;
  }) => {
    setSectionStatusMap(prev => ({
      ...prev,
      [sectionIndex]: status
    }));
  }, []);

  return (
    <div className="w-full flex flex-col h-full relative">
      <div className="flex-grow overflow-y-auto max-h-[calc(80vh-200px)]">
        <FormValuesProvider defaultValues={formData}>
          <Accordion type="single" collapsible>
            {form.sections.map((section, index) => (
              <FormAccordionItem
                key={index}
                sectionIndex={index}
                sectionData={section}
                isEditing={editingState}
                defaultValues={formData}
                formId={formId}
                userRole={userRole}
                formStatus={formStatus}
                lda_id={lda_id}
                dataChanged={dataChanged}
                onSectionStatusChange={(status: { isValid: boolean; completed: number; required: number }) => handleSectionStatusChange(index, status)}
              />
            ))}
          </Accordion>
        </FormValuesProvider>
      </div>
    {editingState && (
      <div className="sticky bottom-0 left-0 right-0 flex justify-end p-2 bg-white border-t z-10">
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
            Done
          </Button>
      </div>
      )}
    </div>
  );
}

export default DynamicForm;
