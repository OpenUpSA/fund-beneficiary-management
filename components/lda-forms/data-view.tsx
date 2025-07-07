import { Form } from "@/types/forms"
import React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion"
import { CircleSmall } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  data: Record<string, string>
  form: Form
}

export default function LDAFormDataView({ data, form }: Props) {
  // Function to calculate completion status for a section
  const getSectionCompletionStatus = (sectionFields: Form['sections'][0]['fields']) => {
    const totalFields = sectionFields.length;
    if (totalFields === 0) return { completed: 0, required: 0 };
    
    const completedFields = sectionFields.filter(field => {
      return data[field.name] && data[field.name].trim() !== '';
    }).length;
    
    // Assuming all fields are required for now
    // This can be adjusted based on actual field requirements
    const requiredFields = totalFields;
    
    return { completed: completedFields, required: requiredFields };
  };

  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={[]}>
        {form.sections.map((section, sectionIndex) => {
          const { completed, required } = getSectionCompletionStatus(section.fields);
          const isComplete = completed === required && required > 0;
          const isEmpty = completed === 0;
          // We don't need isPartial as we're using a default style for partial completion
          
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
                  isEmpty ? "bg-red-50 dark:bg-red-950" :
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
                        {data[field.name] ? (
                          <span>{data[field.name]}</span>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
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
  )
}
