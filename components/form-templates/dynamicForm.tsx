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
  failedSectionTitles,
  focusMode = false,
  initialOpenSection,
  initialHighlightField,
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
  failedSectionTitles?: string[]
  focusMode?: boolean
  /** Section index to open and scroll to on mount (deep-link from the reporting dashboard). */
  initialOpenSection?: number
  /** Field name to scroll to and briefly outline within the opened section. */
  initialHighlightField?: string
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

  // Deep-link: open + scroll to the requested section (via defaultValue below), then
  // scroll to and briefly outline the requested field. The target field may be
  // gated by a `show_if` that only renders it once the form-values store hydrates,
  // so we poll for the anchor rather than assuming it exists at a fixed tick. The
  // section scroll runs immediately as a floor; the field scroll upgrades it when
  // the anchor appears. All no-ops if the field/section stays hidden. Inline styles
  // (not Tailwind classes) so the highlight survives production CSS purging.
  // No run-once ref guard: in StrictMode the effect mounts, is cleaned up, then
  // re-mounts. A persistent ref would stay set through the cleanup and make the
  // second (real) mount return early, cancelling every timer. The deps are stable
  // URL params, so the effect only runs on mount anyway.
  useEffect(() => {
    if (initialOpenSection == null) return;

    let cancelled = false;
    const deadline = Date.now() + 3000;

    // Position the section first so the page isn't left at the top while we wait.
    const start = setTimeout(() => {
      document.getElementById(`section-${initialOpenSection}`)?.scrollIntoView({ block: "start" });
    }, 100);

    const flash = (el: HTMLElement) => {
      const prev = el.style.cssText;
      // A clearly visible amber wash + outline so the matched field is obvious even
      // if it was already near the viewport and the scroll barely moved.
      el.style.transition = "background-color 0.3s ease, outline-color 0.3s ease";
      el.style.backgroundColor = "rgba(245, 158, 11, 0.15)";
      el.style.outline = "2px solid #f59e0b";
      el.style.outlineOffset = "2px";
      el.style.borderRadius = "6px";
      el.style.scrollMarginTop = "80px"; // clear any sticky header above the scroll area
      setTimeout(() => { if (!cancelled) el.style.cssText = prev; }, 2600);
    };

    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const findField = () => {
      if (cancelled || !initialHighlightField) return;
      const el = document.getElementById(`field-${initialHighlightField}`);
      if (el) {
        el.scrollIntoView({ block: "center" });
        flash(el);
        // The section's open animation and any show_if fields keep shifting layout
        // for a moment after the anchor appears, so re-scroll once it has settled.
        settleTimer = setTimeout(() => {
          if (!cancelled) el.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 400);
      } else if (Date.now() < deadline) {
        pollTimer = setTimeout(findField, 150);
      }
    };
    pollTimer = setTimeout(findField, 250);

    return () => {
      cancelled = true;
      clearTimeout(start);
      if (pollTimer) clearTimeout(pollTimer);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [initialOpenSection, initialHighlightField]);

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
      <div
        className={
          focusMode
            ? "flex-grow h-auto max-h-full"
            : "flex-grow overflow-y-auto max-h-[calc(80vh-200px)]"
        }
      >
        <FormValuesProvider defaultValues={formData}>
          <Accordion
            type="single"
            collapsible
            defaultValue={initialOpenSection != null ? `section-${initialOpenSection}` : undefined}
          >
            {form.sections.map((section, index) => (
              <FormAccordionItem
                key={index}
                id={`section-${index}`}
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
                hasSubmitError={failedSectionTitles?.includes(section.title) ?? false}
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
