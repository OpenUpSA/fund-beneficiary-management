import { Form, Field } from "@/types/forms"

// Field types that hold no answer data
const SKIP_TYPES = new Set(["info", "data-table"])

export type FormData = Record<string, string>

export function resolveLabel(field: Field, raw: string): string {
  if (field.type === "toggle") return raw === "true" ? "Yes" : raw === "false" ? "No" : raw
  if (field.type === "radio" || field.type === "select") {
    return field.options?.find((o) => o.value === raw)?.label ?? raw
  }
  if (field.type === "multiselect") {
    try {
      const values = JSON.parse(raw) as string[]
      return values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ")
    } catch { return raw }
  }
  return raw
}

function repeatableIndices(raw: string): number[] {
  try { return JSON.parse(raw) as number[] } catch { return [] }
}

/** Tall layout for a single response: [Section, Question, Answer] rows. */
export function buildResponseRows(form: Form, formData: FormData): string[][] {
  const rows: string[][] = [["Section", "Question", "Answer"]]

  for (const section of form.sections) {
    for (const field of section.fields) {
      if (SKIP_TYPES.has(field.type)) continue

      if (field.type === "group" && field.fields) {
        for (const sub of field.fields) {
          const raw = formData[`${field.name}_${sub.name}`] ?? ""
          rows.push([section.title, `${field.label} – ${sub.label}`, resolveLabel(sub, raw)])
        }
        continue
      }

      if (field.type === "repeatable" && field.template) {
        const raw = formData[field.name] ?? ""
        for (const idx of repeatableIndices(raw)) {
          for (const tmpl of field.template) {
            const val = formData[`${field.name}_${tmpl.name}_${idx}`] ?? ""
            rows.push([section.title, `${field.label} #${idx} – ${tmpl.label}`, resolveLabel(tmpl, val)])
          }
        }
        continue
      }

      const raw = formData[field.name] ?? ""
      rows.push([section.title, field.label, resolveLabel(field, raw)])
    }
  }

  return rows
}

/**
 * Wide (matrix) layout for many responses of the same template:
 * one column per question, one row per response.
 */
export function buildMatrixHeader(form: Form): string[] {
  const columns: string[] = []
  for (const section of form.sections) {
    for (const field of section.fields) {
      if (SKIP_TYPES.has(field.type)) continue
      if (field.type === "group" && field.fields) {
        for (const sub of field.fields) columns.push(`${field.label} – ${sub.label}`)
        continue
      }
      columns.push(field.label)
    }
  }
  return columns
}

export function buildMatrixRow(form: Form, formData: FormData): string[] {
  const cells: string[] = []
  for (const section of form.sections) {
    for (const field of section.fields) {
      if (SKIP_TYPES.has(field.type)) continue

      if (field.type === "group" && field.fields) {
        for (const sub of field.fields) {
          cells.push(resolveLabel(sub, formData[`${field.name}_${sub.name}`] ?? ""))
        }
        continue
      }

      if (field.type === "repeatable" && field.template) {
        const entries = repeatableIndices(formData[field.name] ?? "").map((idx) =>
          (field.template ?? [])
            .map((tmpl) => `${tmpl.label}: ${resolveLabel(tmpl, formData[`${field.name}_${tmpl.name}_${idx}`] ?? "")}`)
            .join("; ")
        )
        cells.push(entries.join(" | "))
        continue
      }

      cells.push(resolveLabel(field, formData[field.name] ?? ""))
    }
  }
  return cells
}

export function toCSV(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
}
