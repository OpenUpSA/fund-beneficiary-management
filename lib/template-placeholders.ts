import { format } from "date-fns"

// Form templates may reference the form's reporting period in human-readable
// text via placeholders instead of hardcoded dates:
//   {{period_start}} / {{period_end}} — the form's fundingStart/fundingEnd
//   {{year}}                          — year of the period start (fallback: end)
// Substitution happens server-side wherever a form instance's template is
// served (form API, exports), so the renderer, previews, PDFs and CSVs all
// see the resolved text. Without a form instance (e.g. bulk export across
// periods) neutral wording is used instead.

export interface PlaceholderValues {
  period_start: string
  period_end: string
  year: string
}

const NEUTRAL_VALUES: PlaceholderValues = {
  period_start: "start of the reporting period",
  period_end: "end of the reporting period",
  year: "the funding year",
}

export function buildPlaceholderValues(dates?: {
  fundingStart?: Date | string | null
  fundingEnd?: Date | string | null
}): PlaceholderValues {
  const start = dates?.fundingStart ? new Date(dates.fundingStart) : null
  const end = dates?.fundingEnd ? new Date(dates.fundingEnd) : null
  if (!start && !end) return NEUTRAL_VALUES
  const yearBasis = start ?? end
  return {
    period_start: start ? format(start, "d MMMM yyyy") : NEUTRAL_VALUES.period_start,
    period_end: end ? format(end, "d MMMM yyyy") : NEUTRAL_VALUES.period_end,
    year: String(yearBasis!.getFullYear()),
  }
}

const PLACEHOLDER_RE = /\{\{\s*(period_start|period_end|year)\s*\}\}/g

export function substitutePlaceholders(text: string, values: PlaceholderValues): string {
  return text.replace(PLACEHOLDER_RE, (_, key: keyof PlaceholderValues) => values[key])
}

// String properties that carry human-readable text in template JSON
const TEXT_KEYS = new Set(["title", "description", "label", "notice", "placeholder", "totalLabel"])

/** Deep-walk a template (or any JSON value) substituting placeholders in text properties. */
export function substituteTemplatePlaceholders<T>(node: T, values: PlaceholderValues): T {
  if (Array.isArray(node)) {
    return node.map((item) => substituteTemplatePlaceholders(item, values)) as T
  }
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string" && TEXT_KEYS.has(key) && value.includes("{{")) {
        out[key] = substitutePlaceholders(value, values)
      } else {
        out[key] = substituteTemplatePlaceholders(value, values)
      }
    }
    return out as T
  }
  return node
}
