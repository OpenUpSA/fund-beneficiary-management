import type { Field } from "@/types/forms"

// Shared completeness rules for form-template fields. Three consumers must
// agree — load-time hydration and live onChange updates in
// form-accordion-item.tsx, and the per-entry card badge in
// narrative-repeatable.tsx — and previously drifted: `group` fields hold no
// scalar value (their data lives in nested children), so any check reading
// `field.value` reports a filled group as incomplete forever.

/** Non-empty check for a scalar field value; fileUpload stores a JSON array. */
export function isScalarValueComplete(value: string, type?: string): boolean {
  if (type === "fileUpload") {
    if (!value || value.trim() === "") return false
    try {
      return JSON.parse(value).length > 0
    } catch {
      return false
    }
  }
  return value.trim() !== ""
}

/**
 * Value-based completeness for an already-hydrated field tree (e.g. the
 * per-entry fields of a repeatable). Hidden, info, and optional fields pass;
 * groups recurse into their children; scalars need a non-empty value.
 */
export function isFieldComplete(field: Field): boolean {
  if (field.show === false) return true
  if (field.type === "info") return true
  if (!field.required) return true
  if (field.fields && field.fields.length > 0) {
    return field.fields.every(isFieldComplete)
  }
  return isScalarValueComplete(field.value ?? "", field.type)
}

/**
 * isValid-based completeness of a group, derived from its children's already
 * computed `isValid` flags: every visible required child must be valid.
 */
export function computeGroupValidity(group: Field): boolean {
  return (group.fields ?? []).every((child) =>
    child.show !== false && child.required ? Boolean(child.isValid) : true
  )
}
