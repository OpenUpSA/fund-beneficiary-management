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
 * Max number of entries per repeatable field across a set of responses.
 * Drives how many per-entry column groups the matrix layout emits.
 */
export function repeatableMaxEntries(form: Form, datas: FormData[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const section of form.sections) {
    for (const field of section.fields) {
      if (field.type !== "repeatable" || !field.template) continue
      counts[field.name] = Math.max(
        1,
        ...datas.map((data) => repeatableIndices(data[field.name] ?? "").length)
      )
    }
  }
  return counts
}

/**
 * Wide (matrix) layout for many responses of the same template:
 * one column per question, one row per response. Repeatable fields expand
 * into per-entry column groups ("Challenge #1 – Description", …) sized by
 * the largest entry count across the exported responses.
 */
export function buildMatrixHeader(form: Form, repeatCounts: Record<string, number>): string[] {
  const columns: string[] = []
  for (const section of form.sections) {
    for (const field of section.fields) {
      if (SKIP_TYPES.has(field.type)) continue
      if (field.type === "group" && field.fields) {
        for (const sub of field.fields) columns.push(`${field.label} – ${sub.label}`)
        continue
      }
      if (field.type === "repeatable" && field.template) {
        const count = repeatCounts[field.name] ?? 1
        for (let n = 1; n <= count; n++) {
          for (const tmpl of field.template) {
            columns.push(`${field.label} #${n} – ${tmpl.label}`)
          }
        }
        continue
      }
      columns.push(field.label)
    }
  }
  return columns
}

export function buildMatrixRow(
  form: Form,
  formData: FormData,
  repeatCounts: Record<string, number>
): string[] {
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
        const count = repeatCounts[field.name] ?? 1
        const indices = repeatableIndices(formData[field.name] ?? "")
        for (let n = 0; n < count; n++) {
          const idx = indices[n]
          for (const tmpl of field.template) {
            cells.push(
              idx === undefined
                ? ""
                : resolveLabel(tmpl, formData[`${field.name}_${tmpl.name}_${idx}`] ?? "")
            )
          }
        }
        continue
      }

      cells.push(resolveLabel(field, formData[field.name] ?? ""))
    }
  }
  return cells
}

// ── JSON export ──────────────────────────────────────────────────────────────

export interface ResponseMeta {
  ldaFormId: number
  ldaId: number
  ldaName: string
  status: string
  submitted: string | null
}

/** Resolve a single field's raw value into a JSON-friendly value. */
function jsonScalar(field: Field, raw: string): unknown {
  if (field.type === "toggle") return raw === "true" ? true : raw === "false" ? false : raw || null
  if (field.type === "multiselect") {
    try {
      const values = JSON.parse(raw) as string[]
      return values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v)
    } catch { return raw || null }
  }
  if (field.type === "radio" || field.type === "select") {
    return field.options?.find((o) => o.value === raw)?.label ?? (raw || null)
  }
  return raw || null
}

function jsonValue(field: Field, formData: FormData): unknown {
  if (field.type === "repeatable" && field.template) {
    return repeatableIndices(formData[field.name] ?? "").map((idx) => {
      const entry: Record<string, unknown> = {}
      for (const tmpl of field.template ?? []) {
        entry[tmpl.label] = jsonScalar(tmpl, formData[`${field.name}_${tmpl.name}_${idx}`] ?? "")
      }
      return entry
    })
  }
  return jsonScalar(field, formData[field.name] ?? "")
}

/**
 * Template-shaped JSON export: the form's sections and questions, with each
 * question carrying the list of responses (LDA id, name, and value).
 * Group subfields become their own questions; repeatables export as arrays
 * of entry objects keyed by subfield label.
 */
export function buildJsonExport(
  form: Form,
  template: { id: number; name: string },
  responses: Array<ResponseMeta & { formData: FormData }>
) {
  const respond = (field: Field, valueOf: (data: FormData) => unknown) =>
    responses.map((r) => ({
      ldaFormId: r.ldaFormId,
      ldaId: r.ldaId,
      ldaName: r.ldaName,
      value: valueOf(r.formData),
    }))

  return {
    template: { id: template.id, name: template.name, title: form.title },
    responseCount: responses.length,
    responses: responses.map(({ ldaFormId, ldaId, ldaName, status, submitted }) => ({
      ldaFormId, ldaId, ldaName, status, submitted,
    })),
    sections: form.sections.map((section) => ({
      title: section.title,
      questions: section.fields
        .filter((field) => !SKIP_TYPES.has(field.type))
        .flatMap((field) => {
          if (field.type === "group" && field.fields) {
            return field.fields.map((sub) => ({
              name: `${field.name}_${sub.name}`,
              label: `${field.label} – ${sub.label}`,
              type: sub.type,
              responses: respond(sub, (data) => jsonScalar(sub, data[`${field.name}_${sub.name}`] ?? "")),
            }))
          }
          return [{
            name: field.name,
            label: field.label,
            type: field.type,
            responses: respond(field, (data) => jsonValue(field, data)),
          }]
        }),
    })),
  }
}

export function toCSV(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
}
