"use client"

import { InlineEditableField } from "@/components/ui/inline-editable-field";
import { LDA_TERMINOLOGY } from "@/constants/lda";

// Define a type for the operations data to ensure consistency
// All fields are optional to handle cases where they might be null or undefined initially.
type OperationsData = {
  vision?: { value: string; originalValue: string; edited: boolean };
  mission?: { value: string; originalValue: string; edited: boolean };
  objectives?: { value: string; originalValue: string; edited: boolean };
  programmaticAreas?: { value: string; originalValue: string; edited: boolean };
  climateFocus?: { value: string; originalValue: string; edited: boolean };
  youthFocus?: { value: string; originalValue: string; edited: boolean };
  genderFocus?: { value: string; originalValue: string; edited: boolean };
  fundraisingStrategies?: { value: string; originalValue: string; edited: boolean };
  partnershipsWithinOutside?: { value: string; originalValue: string; edited: boolean };
  ensureOrgNotReliantOnScatOnly?: { value: string; originalValue: string; edited: boolean };
  nationalAdvocacyStrategies?: { value: string; originalValue: string; edited: boolean };
  monitoringAndLearning?: { value: string; originalValue: string; edited: boolean };
};

interface OperationsTabProps {
  operationsData: OperationsData;
  onSave: (field: keyof OperationsData, value: string) => void;
  onChange: (field: keyof OperationsData, value: string, isEdited: boolean) => void;
}

export function OperationsTab({ operationsData, onSave, onChange }: OperationsTabProps) {
  return (
    <div className="space-y-8 mt-4">

      <div> 
        <h2 className="text-sm font-medium mb-2">Vision & Mission</h2>
        <InlineEditableField
          label="Vision of organisation"
          value={operationsData.vision?.value || ""}
          originalValue={operationsData.vision?.originalValue || ""}
          edited={operationsData.vision?.edited || false}
          multiline
          onSave={value => onSave("vision", value)}
          onChange={(value, isEdited) => onChange("vision", value, isEdited)}
        />
        <InlineEditableField
          label="Mission of organisation"
          value={operationsData.mission?.value || ""}
          originalValue={operationsData.mission?.originalValue || ""}
          edited={operationsData.mission?.edited || false}
          multiline
          onSave={value => onSave("mission", value)}
          onChange={(value, isEdited) => onChange("mission", value, isEdited)}
        />
      </div>
    
      <div className="space-y-4 border-t py-4"> 
      <h2 className="text-sm font-medium mb-2">Objectives & Activities</h2>
          <InlineEditableField
            label="Main objectives of organisation"
            value={operationsData.objectives?.value || ""}
            originalValue={operationsData.objectives?.originalValue || ""}
            edited={operationsData.objectives?.edited || false}
            multiline
            onSave={value => onSave("objectives", value)}
            onChange={(value, isEdited) => onChange("objectives", value, isEdited)}
          />
          <InlineEditableField
            label="Main programmatic areas"
            value={operationsData.programmaticAreas?.value || ""}
            originalValue={operationsData.programmaticAreas?.originalValue || ""}
            edited={operationsData.programmaticAreas?.edited || false}
            multiline
            onSave={value => onSave("programmaticAreas", value)}
            onChange={(value, isEdited) => onChange("programmaticAreas", value, isEdited)}
          />
      </div>

      <div className="space-y-4 border-t py-4"> 
      <h2 className="text-sm font-medium mb-2">Focus Areas</h2>
          <InlineEditableField
            label="How does the organisation contribute to climate"
            value={operationsData.climateFocus?.value || ""}
            originalValue={operationsData.climateFocus?.originalValue || ""}
            edited={operationsData.climateFocus?.edited || false}
            multiline
            onSave={value => onSave("climateFocus", value)}
            onChange={(value, isEdited) => onChange("climateFocus", value, isEdited)}
          />
          <InlineEditableField
            label="How does the organisation contribute to youth"
            value={operationsData.youthFocus?.value || ""}
            originalValue={operationsData.youthFocus?.originalValue || ""}
            edited={operationsData.youthFocus?.edited || false}
            multiline
            onSave={value => onSave("youthFocus", value)}
            onChange={(value, isEdited) => onChange("youthFocus", value, isEdited)}
          />
          <InlineEditableField
            label="How does the organisation contribute to gender"
            value={operationsData.genderFocus?.value || ""}
            originalValue={operationsData.genderFocus?.originalValue || ""}
            edited={operationsData.genderFocus?.edited || false}
            multiline
            onSave={value => onSave("genderFocus", value)}
            onChange={(value, isEdited) => onChange("genderFocus", value, isEdited)}
          />
      </div>

      <div className="space-y-4 border-t py-4"> 
      <h2 className="text-sm font-medium mb-2">Sustainability</h2>
          <InlineEditableField
            label={`What are the local and other fundraising strategies the ${LDA_TERMINOLOGY.shortName} is implementing to raise funding?`}
            value={operationsData.fundraisingStrategies?.value || ""}
            originalValue={operationsData.fundraisingStrategies?.originalValue || ""}
            edited={operationsData.fundraisingStrategies?.edited || false}
            multiline
            onSave={value => onSave("fundraisingStrategies", value)}
            onChange={(value, isEdited) => onChange("fundraisingStrategies", value, isEdited)}
          />
          <InlineEditableField
            label="What are you doing to ensure that your organisation is not reliant on SCAT only for funding?"
            value={operationsData.ensureOrgNotReliantOnScatOnly?.value || ""}
            originalValue={operationsData.ensureOrgNotReliantOnScatOnly?.originalValue || ""}
            edited={operationsData.ensureOrgNotReliantOnScatOnly?.edited || false}
            multiline
            onSave={value => onSave("ensureOrgNotReliantOnScatOnly", value)}
            onChange={(value, isEdited) => onChange("ensureOrgNotReliantOnScatOnly", value, isEdited)}
          />
      </div>

      <div className="space-y-4 border-t py-4"> 
      <h2 className="text-sm font-medium mb-2">Partnerships & Networks</h2>
          <InlineEditableField
            label="Who do you work with within and outside your community? (E.g. CBO partners, key stakeholders, traditional leadership, etc.)"
            value={operationsData.partnershipsWithinOutside?.value || ""}
            originalValue={operationsData.partnershipsWithinOutside?.originalValue || ""}
            edited={operationsData.partnershipsWithinOutside?.edited || false}
            multiline
            onSave={value => onSave("partnershipsWithinOutside", value)}
            onChange={(value, isEdited) => onChange("partnershipsWithinOutside", value, isEdited)}
          />
          <InlineEditableField
            label="Are you connected to any national advocacy strategies or campaigns? If yes, please provide details"
            value={operationsData.nationalAdvocacyStrategies?.value || ""}
            originalValue={operationsData.nationalAdvocacyStrategies?.originalValue || ""}
            edited={operationsData.nationalAdvocacyStrategies?.edited || false}
            multiline
            onSave={value => onSave("nationalAdvocacyStrategies", value)}
            onChange={(value, isEdited) => onChange("nationalAdvocacyStrategies", value, isEdited)}
          />
      </div>

      <div className="space-y-4 border-t py-4"> 
      <h2 className="text-sm font-medium mb-2">Monitoring & Learning</h2>
          <InlineEditableField
            label="What processes do you use in your organisation to monitor your progress and learn from your experiences? (EG, planning, reviewing of organisational plans, etc.)"
            value={operationsData.monitoringAndLearning?.value || ""}
            originalValue={operationsData.monitoringAndLearning?.originalValue || ""}
            edited={operationsData.monitoringAndLearning?.edited || false}
            multiline
            onSave={value => onSave("monitoringAndLearning", value)}
            onChange={(value, isEdited) => onChange("monitoringAndLearning", value, isEdited)}
          />
      </div>
    </div>
  );
}
