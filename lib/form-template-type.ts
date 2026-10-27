// Form template types (FormTemplateType enum) and the wording that depends on them.
// Plain strings rather than the Prisma enum so client components can import this.

export type FormTemplateTypeValue = "APPLICATION" | "REPORT" | "SURVEY"

export const FORM_TEMPLATE_TYPE_OPTIONS: Array<{ value: FormTemplateTypeValue; label: string }> = [
  { value: "APPLICATION", label: "Application" },
  { value: "REPORT", label: "Report" },
  { value: "SURVEY", label: "Survey" },
]

export const FORM_TEMPLATE_TYPE_VALUES = FORM_TEMPLATE_TYPE_OPTIONS.map((o) => o.value) as [
  FormTemplateTypeValue,
  ...FormTemplateTypeValue[],
]

export const formTemplateTypeLabel = (type?: string | null): string =>
  FORM_TEMPLATE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type ?? ""

/**
 * Labels for a form's start/end dates (fundingStart/fundingEnd): a reporting period
 * for reports, the funding period for applications, and a plain date range for surveys.
 */
export function formDateLabels(type?: string | null): { start: string; end: string } {
  switch (type) {
    case "REPORT":
      return { start: "Reporting period start", end: "Reporting period end" }
    case "SURVEY":
      return { start: "Start date", end: "End date" }
    default:
      return { start: "Funding start date", end: "Funding end date" }
  }
}
