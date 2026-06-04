/**
 * Server-side validation for LDA form submissions.
 *
 * Walks the form template and verifies that every required, visible field
 * has a non-empty value in `formData`. Mirrors the frontend completion
 * logic in `components/form-templates/form-accordion-item.tsx` and the
 * custom layouts under `components/form-templates/custom-layouts/`.
 *
 * The goal is to be the authoritative source of truth for "is this
 * submission complete?" — independent of any frontend state. If a section
 * appears green in the UI but data is actually missing, this validator
 * still blocks submission.
 */

import type { Field } from "@/types/forms"

// ---------- Types ----------

type Json = unknown

type FormData = Record<string, Json>

interface Section {
  title: string
  visible_to?: string[]
  editable_by?: string[]
  fields: Field[]
}

interface FormTemplate {
  title?: string
  sections: Section[]
}

export interface ValidationIssue {
  /** Key in formData (or synthetic key for nested JSON structures). */
  fieldName: string
  /** Human-readable label including section / parent context. */
  fieldLabel: string
  /** Section title the issue belongs to. */
  sectionTitle: string
  /** Short message describing the problem. */
  message: string
}

// ---------- Generic helpers ----------

const toStr = (v: Json): string => {
  if (v === undefined || v === null) return ""
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return ""
}

/**
 * Determines whether a stored value is "empty" for the purposes of a
 * required-field check. Type-aware for `fileUpload` (JSON array string)
 * and `multiselect` (comma-separated or JSON array).
 */
const isFieldValueEmpty = (value: Json, fieldType: string | undefined): boolean => {
  if (value === undefined || value === null) return true

  if (Array.isArray(value)) return value.length === 0

  if (typeof value === "object") {
    return Object.keys(value as object).length === 0
  }

  const str = String(value).trim()
  if (str === "") return true

  if (fieldType === "fileUpload") {
    try {
      const parsed = JSON.parse(str)
      return !Array.isArray(parsed) || parsed.length === 0
    } catch {
      return true
    }
  }

  if (fieldType === "multiselect") {
    // Try JSON array first
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) return parsed.length === 0
    } catch {
      /* fall through */
    }
    // Otherwise treat as comma-separated string
    return str.split(",").filter(Boolean).length === 0
  }

  return false
}

const isSectionVisibleToRole = (section: Section, role?: string): boolean => {
  if (!section.visible_to) return true
  if (section.visible_to.length === 0) return false
  if (!role) return false
  return section.visible_to.includes(role)
}

const evaluateShowIf = (
  showIf: { field: string; value: string; show_by_default?: boolean } | undefined,
  formData: FormData
): boolean => {
  if (!showIf) return true
  const watched = formData[showIf.field]
  if (watched === undefined || watched === null) {
    return showIf.show_by_default === true
  }
  return String(watched) === showIf.value
}

const parseRepeatableIndices = (raw: Json): number[] => {
  if (Array.isArray(raw)) {
    return (raw as unknown[]).filter((n): n is number => typeof n === "number")
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((n): n is number => typeof n === "number")
      }
      if (typeof parsed === "number" && parsed > 0) {
        // Legacy count format: convert to [1..N]
        return Array.from({ length: parsed }, (_, i) => i + 1)
      }
    } catch {
      /* ignore */
    }
  }
  return []
}

// ---------- Custom-layout validators ----------

interface CaseworkCategory {
  name: string
  label: string
  caseTypes: Array<{ name: string; label: string }>
}

interface NamedColumn {
  name: string
  label: string
}

const readArrayConfig = <T,>(config: Record<string, unknown> | undefined, key: string): T[] => {
  const v = config?.[key]
  return Array.isArray(v) ? (v as T[]) : []
}

const readStringConfig = (
  config: Record<string, unknown> | undefined,
  key: string,
  fallback: string
): string => {
  const v = config?.[key]
  return typeof v === "string" && v.length > 0 ? v : fallback
}

/**
 * Mirrors the frontend completion logic in
 * `components/form-templates/custom-layouts/casework-categories.tsx`.
 * Every (category × caseType × column) cell must have a non-empty value.
 */
const validateCaseworkCategories = (
  field: Field,
  formData: FormData,
  sectionTitle: string,
  issues: ValidationIssue[]
): void => {
  const categories = readArrayConfig<CaseworkCategory>(field.config, "categories")
  const columns = readArrayConfig<NamedColumn>(field.config, "columns")
  const effectiveColumns: NamedColumn[] = columns.length > 0
    ? columns
    : [
        { name: "client", label: "Opened (by client)" },
        { name: "thirdparty", label: "Opened (by third party)" },
      ]
  const headerLabel = readStringConfig(field.config, "headerLabel", field.label || field.name)

  for (const category of categories) {
    for (const caseType of category.caseTypes) {
      for (const column of effectiveColumns) {
        const key = `${field.name}_${category.name}_${caseType.name}_${column.name}`
        if (isFieldValueEmpty(formData[key], "number")) {
          issues.push({
            fieldName: key,
            fieldLabel: `${headerLabel} – ${category.label} – ${caseType.label} – ${column.label}`,
            sectionTitle,
            message: "is required",
          })
        }
      }
    }
  }
}

/**
 * Mirrors `custom-layouts/finalised-cases.tsx`. Cases section: all matrix
 * cells required. Demographics: only for categories whose case total > 0;
 * skipping a demographic requires a reason.
 */
const validateFinalisedCases = (
  field: Field,
  formData: FormData,
  sectionTitle: string,
  issues: ValidationIssue[]
): void => {
  const categories = readArrayConfig<CaseworkCategory>(field.config, "categories")
  const casesColumns = readArrayConfig<NamedColumn>(field.config, "casesColumns")
  const effectiveCasesColumns: NamedColumn[] = casesColumns.length > 0
    ? casesColumns
    : [
        { name: "referred", label: "Referred" },
        { name: "closed", label: "Closed" },
      ]
  const demographics = readArrayConfig<{
    name: string
    label: string
    columns: NamedColumn[]
  }>(field.config, "demographics")
  const casesLabel = readStringConfig(field.config, "casesLabel", field.label || field.name)

  // Cases section
  for (const category of categories) {
    for (const caseType of category.caseTypes) {
      for (const column of effectiveCasesColumns) {
        const key = `${field.name}_cases_${category.name}_${caseType.name}_${column.name}`
        if (isFieldValueEmpty(formData[key], "number")) {
          issues.push({
            fieldName: key,
            fieldLabel: `${casesLabel} – ${category.label} – ${caseType.label} – ${column.label}`,
            sectionTitle,
            message: "is required",
          })
        }
      }
    }
  }

  // Only validate demographics for categories that have at least one case
  const categoriesWithCases = categories.filter((cat) => {
    let total = 0
    for (const caseType of cat.caseTypes) {
      for (const column of effectiveCasesColumns) {
        const key = `${field.name}_cases_${cat.name}_${caseType.name}_${column.name}`
        const n = parseInt(toStr(formData[key]) || "0", 10)
        if (!Number.isNaN(n)) total += n
      }
    }
    return total > 0
  })

  for (const demo of demographics) {
    for (const category of categoriesWithCases) {
      const skipKey = `${field.name}_${demo.name}_${category.name}_skip`
      const skipReasonKey = `${field.name}_${demo.name}_${category.name}_skip_reason`
      const isSkipped = toStr(formData[skipKey]) === "true"

      if (isSkipped) {
        if (isFieldValueEmpty(formData[skipReasonKey], "textarea")) {
          issues.push({
            fieldName: skipReasonKey,
            fieldLabel: `${demo.label} – ${category.label} – reason for skipping`,
            sectionTitle,
            message: "is required when demographic data is skipped",
          })
        }
        continue
      }

      for (const caseType of category.caseTypes) {
        for (const column of demo.columns) {
          const key = `${field.name}_${demo.name}_${category.name}_${caseType.name}_${column.name}`
          if (isFieldValueEmpty(formData[key], "number")) {
            issues.push({
              fieldName: key,
              fieldLabel: `${demo.label} – ${category.label} – ${caseType.label} – ${column.label}`,
              sectionTitle,
              message: "is required",
            })
          }
        }
      }
    }
  }
}

/**
 * Extracts the list of "complete" gardens that linked layouts iterate
 * over. Matches the logic in
 * `app/api/lda-form/[lda_form_id]/linked-data/route.ts`: a garden is
 * complete when every required field has a non-empty value.
 */
const getCompleteGardens = (
  formData: FormData,
  sourceField: string,
  gardenNameField: string,
  requiredFields: string[]
): Array<{ id: number; name: string }> => {
  const indices = parseRepeatableIndices(formData[sourceField])
  const gardens: Array<{ id: number; name: string }> = []

  for (const idx of indices) {
    const isComplete = requiredFields.every((reqField) => {
      const key = `${sourceField}_${reqField}_${idx}`
      return !isFieldValueEmpty(formData[key], undefined)
    })
    if (!isComplete) continue
    const name = toStr(formData[`${sourceField}_${gardenNameField}_${idx}`]) || `Garden ${idx}`
    gardens.push({ id: idx, name })
  }
  return gardens
}

/**
 * Mirrors `custom-layouts/garden-beneficiaries.tsx`. The frontend
 * `isComplete` only gates on demographics being filled in for every
 * complete garden; we validate the same way here.
 */
const validateGardenBeneficiaries = (
  field: Field,
  formData: FormData,
  sectionTitle: string,
  issues: ValidationIssue[]
): void => {
  const sourceField = readStringConfig(field.config, "sourceField", "community_gardens")
  const gardenNameField = readStringConfig(field.config, "gardenNameField", "garden_name")
  const requiredFields = readArrayConfig<string>(field.config, "requiredFields")
  const effectiveRequired = requiredFields.length > 0
    ? requiredFields
    : ["garden_name", "garden_size", "garden_address", "contact_person", "contact_number", "external_support"]
  const demographics = readArrayConfig<{
    name: string
    label: string
    columns: NamedColumn[]
  }>(field.config, "demographics")
  const baseLabel = field.label || field.name

  const gardens = getCompleteGardens(formData, sourceField, gardenNameField, effectiveRequired)
  if (gardens.length === 0) return

  for (const demo of demographics) {
    for (const garden of gardens) {
      for (const column of demo.columns) {
        const key = `${field.name}_${demo.name}_${garden.id}_${column.name}`
        if (isFieldValueEmpty(formData[key], "number")) {
          issues.push({
            fieldName: key,
            fieldLabel: `${baseLabel} – ${demo.label} – ${garden.name} – ${column.label}`,
            sectionTitle,
            message: "is required",
          })
        }
      }
    }
  }
}

interface YieldItem {
  name?: string
  [k: string]: unknown
}

interface YieldData {
  existing?: YieldItem[]
  added?: YieldItem[]
  removed?: YieldItem[]
  noYield?: boolean
  noYieldReason?: string
}

const parseYieldData = (raw: Json): YieldData => {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as YieldData
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Legacy format
        return { existing: parsed as YieldItem[] }
      }
      if (parsed && typeof parsed === "object") {
        return parsed as YieldData
      }
    } catch {
      /* ignore */
    }
  }
  return {}
}

/**
 * Mirrors `custom-layouts/garden-yields.tsx`. For each complete garden
 * the user must either toggle "no yield this term" with a reason, or
 * record at least one farmed item with all required columns filled.
 */
const validateGardenYields = (
  field: Field,
  formData: FormData,
  sectionTitle: string,
  issues: ValidationIssue[]
): void => {
  const sourceField = readStringConfig(field.config, "sourceField", "community_gardens")
  const gardenNameField = readStringConfig(field.config, "gardenNameField", "garden_name")
  const requiredFields = readArrayConfig<string>(field.config, "requiredFields")
  const effectiveRequired = requiredFields.length > 0
    ? requiredFields
    : ["garden_name", "garden_size", "garden_address", "contact_person", "contact_number", "external_support"]
  const columns = readArrayConfig<NamedColumn>(field.config, "columns")
  const effectiveColumns: NamedColumn[] = columns.length > 0
    ? columns
    : [
        { name: "units_planted", label: "Units planted" },
        { name: "harvested_kg", label: "Harvested (kg)" },
        { name: "sold_kg", label: "Sold (kg)" },
      ]
  const baseLabel = field.label || field.name

  const gardens = getCompleteGardens(formData, sourceField, gardenNameField, effectiveRequired)
  if (gardens.length === 0) return

  for (const garden of gardens) {
    const yieldKey = `${field.name}_${garden.id}`
    const data = parseYieldData(formData[yieldKey])

    if (data.noYield) {
      if (isFieldValueEmpty(data.noYieldReason, "textarea")) {
        issues.push({
          fieldName: `${yieldKey}.noYieldReason`,
          fieldLabel: `${baseLabel} – ${garden.name} – reason for no yield`,
          sectionTitle,
          message: "is required when 'no yield this term' is set",
        })
      }
      continue
    }

    const existing = Array.isArray(data.existing) ? data.existing : []
    const added = Array.isArray(data.added) ? data.added : []

    if (existing.length === 0 && added.length === 0) {
      issues.push({
        fieldName: yieldKey,
        fieldLabel: `${baseLabel} – ${garden.name}`,
        sectionTitle,
        message: "requires at least one farmed item (or mark 'no yield this term')",
      })
      continue
    }

    const checkItem = (item: YieldItem, source: "existing" | "added", index: number) => {
      const itemLabel = toStr(item.name) || `Item ${index + 1}`
      if (isFieldValueEmpty(item.name, "text")) {
        issues.push({
          fieldName: `${yieldKey}.${source}[${index}].name`,
          fieldLabel: `${baseLabel} – ${garden.name} – ${itemLabel} – Item name`,
          sectionTitle,
          message: "is required",
        })
      }
      for (const column of effectiveColumns) {
        if (isFieldValueEmpty(item[column.name] as Json, "number")) {
          issues.push({
            fieldName: `${yieldKey}.${source}[${index}].${column.name}`,
            fieldLabel: `${baseLabel} – ${garden.name} – ${itemLabel} – ${column.label}`,
            sectionTitle,
            message: "is required",
          })
        }
      }
    }

    existing.forEach((item, i) => checkItem(item, "existing", i))
    added.forEach((item, i) => checkItem(item, "added", i))
  }
}

// ---------- Tree walker ----------

const CUSTOM_GROUP_LAYOUTS: Record<string, (
  field: Field,
  formData: FormData,
  sectionTitle: string,
  issues: ValidationIssue[]
) => void> = {
  "casework-categories": validateCaseworkCategories,
  "finalised-cases": validateFinalisedCases,
  "garden-beneficiaries": validateGardenBeneficiaries,
  "garden-yields": validateGardenYields,
}

const collectFieldIssues = (
  field: Field,
  effectiveName: string,
  formData: FormData,
  sectionTitle: string,
  issues: ValidationIssue[]
): void => {
  // Non-data and explicitly hidden fields
  if (field.show === false) return
  if (field.type === "info") return

  // Conditional visibility
  if (!evaluateShowIf(field.show_if, formData)) return

  // Custom group layouts handled by dedicated validators
  if (field.layout && CUSTOM_GROUP_LAYOUTS[field.layout]) {
    CUSTOM_GROUP_LAYOUTS[field.layout](field, formData, sectionTitle, issues)
    return
  }

  // Repeatable fields: validate every required field in each item template
  if (field.type === "repeatable" && field.template) {
    const indices = parseRepeatableIndices(formData[effectiveName])

    if (field.required && indices.length === 0) {
      issues.push({
        fieldName: effectiveName,
        fieldLabel: field.label || effectiveName,
        sectionTitle,
        message: "requires at least one entry",
      })
      return
    }

    for (const idx of indices) {
      for (const templateField of field.template) {
        const indexedName = `${field.name}_${templateField.name}_${idx}`
        const remappedShowIf = templateField.show_if
          ? {
              ...templateField.show_if,
              field: `${field.name}_${templateField.show_if.field}_${idx}`,
            }
          : undefined
        const mapped: Field = remappedShowIf
          ? { ...templateField, show_if: remappedShowIf }
          : templateField
        collectFieldIssues(mapped, indexedName, formData, sectionTitle, issues)
      }
    }
    return
  }

  // Group fields: recurse into sub-fields with prefixed names
  if (field.type === "group" && field.fields) {
    for (const sub of field.fields) {
      const subEffectiveName = sub.name.startsWith(effectiveName + "_")
        ? sub.name
        : `${effectiveName}_${sub.name}`
      collectFieldIssues(sub, subEffectiveName, formData, sectionTitle, issues)
    }
    return
  }

  // Leaf required-field check
  if (field.required) {
    if (isFieldValueEmpty(formData[effectiveName], field.type)) {
      issues.push({
        fieldName: effectiveName,
        fieldLabel: field.label || effectiveName,
        sectionTitle,
        message: "is required",
      })
    }
  }
}

// ---------- Public entry point ----------

/**
 * Validate a form submission server-side. Returns the list of
 * outstanding issues; an empty array means the form is complete.
 *
 * @param template The form template JSON (from `FormTemplate.form`).
 * @param formData The saved `formData` object on the LDA form.
 * @param userRole The role of the user submitting (used to skip sections
 * not visible to them, e.g., admin-only review sections).
 */
export const validateFormSubmission = (
  template: FormTemplate | null | undefined,
  formData: FormData | null | undefined,
  userRole?: string
): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const sections = template?.sections ?? []
  const data = formData ?? {}

  for (const section of sections) {
    if (!isSectionVisibleToRole(section, userRole)) continue
    for (const field of section.fields) {
      collectFieldIssues(field, field.name, data, section.title, issues)
    }
  }

  return issues
}

// Used for casting `formTemplate.form` from Prisma's Json type.
export type FormTemplateInput = FormTemplate
