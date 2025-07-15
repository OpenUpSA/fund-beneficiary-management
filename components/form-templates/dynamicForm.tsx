"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormData } from "@/types/forms"
import { Accordion } from "@/components/ui/accordion"
import FormAccordionItem from "@/components/form-templates/form-accordion-item"


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
  userRole,
}: {
  form: FormTemplate["form"]
  setData?: React.Dispatch<React.SetStateAction<FormData>>
  defaultValues?: FormData
  isEditing?: boolean
  setParentEditing?: (isEditing: boolean) => void
  formId?: number | string
  userRole?: string
}) {
  // Force re-render when isEditing changes
  const [editingState, setEditingState] = useState(true);
  
  // Track form data internally - using defaultValues directly
  const formData = defaultValues || {};
  
  useEffect(() => {
    setEditingState(isEditing);
  }, [isEditing]);
  
  // Update parent component with form data changes when defaultValues change
  useEffect(() => {
    if (setData) {
      setData(defaultValues);
    }
  }, [defaultValues, setData]);

  return (
    <div className="w-full flex flex-col h-full relative">
      <div className="flex-grow overflow-y-auto max-h-[calc(80vh-200px)]">
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
            />
          ))}
        </Accordion>
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
