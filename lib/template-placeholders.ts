import { format, differenceInCalendarMonths } from "date-fns"

// Form templates may reference the form's reporting period in human-readable
// text via placeholders instead of hardcoded dates:
//   {{period_start}} / {{period_end}}           — full dates from fundingStart/fundingEnd
//   {{start_month}} / {{end_month}}             — month names ("January", "September")
//   {{start_month_short}} / {{end_month_short}} — abbreviated ("Jan", "Sep")
//   {{year}}                                    — year of the period start (fallback: end)
//   {{period_months}}                           — calendar months in the period, inclusive ("9")
//   {{period_months_words}}                     — same count as word + digit ("nine (9)")
// Substitution happens server-side wherever a form instance's template is
// served (form API, exports), so the renderer, previews, PDFs and CSVs all
// see the resolved text. Without a form instance (e.g. bulk export across
// periods) neutral wording is used instead.

export interface PlaceholderValues {
  period_start: string
  period_end: string
  start_month: string
  end_month: string
  start_month_short: string
  end_month_short: string
  year: string
  period_months: string
  period_months_words: string
}

const NEUTRAL_VALUES: PlaceholderValues = {
  period_start: "start of the reporting period",
  period_end: "end of the reporting period",
  start_month: "the first month",
  end_month: "the last month",
  start_month_short: "the first month",
  end_month_short: "the last month",
  year: "the funding year",
  period_months: "several",
  period_months_words: "several",
}

// Invalid dates are treated as absent — format() would throw on them
const toValidDate = (value?: Date | string | null): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date
}

const MONTH_WORDS = [
  "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
]

// "nine (9)" for counts we can spell; plain digits beyond twelve
const monthsAsWords = (count: number): string =>
  count >= 1 && count <= 12 ? `${MONTH_WORDS[count - 1]} (${count})` : String(count)

export function buildPlaceholderValues(dates?: {
  fundingStart?: Date | string | null
  fundingEnd?: Date | string | null
}): PlaceholderValues {
  const start = toValidDate(dates?.fundingStart)
  const end = toValidDate(dates?.fundingEnd)
  if (!start && !end) return NEUTRAL_VALUES
  const yearBasis = start ?? end
  // Calendar months touched by the period, inclusive: 1 Apr - 31 Dec = 9
  const monthCount =
    start && end ? Math.max(1, differenceInCalendarMonths(end, start) + 1) : null
  return {
    period_start: start ? format(start, "d MMMM yyyy") : NEUTRAL_VALUES.period_start,
    period_end: end ? format(end, "d MMMM yyyy") : NEUTRAL_VALUES.period_end,
    start_month: start ? format(start, "MMMM") : NEUTRAL_VALUES.start_month,
    end_month: end ? format(end, "MMMM") : NEUTRAL_VALUES.end_month,
    start_month_short: start ? format(start, "MMM") : NEUTRAL_VALUES.start_month_short,
    end_month_short: end ? format(end, "MMM") : NEUTRAL_VALUES.end_month_short,
    year: String(yearBasis!.getFullYear()),
    period_months: monthCount !== null ? String(monthCount) : NEUTRAL_VALUES.period_months,
    period_months_words: monthCount !== null ? monthsAsWords(monthCount) : NEUTRAL_VALUES.period_months_words,
  }
}

const PLACEHOLDER_RE =
  /\{\{\s*(period_start|period_end|start_month|end_month|start_month_short|end_month_short|year|period_months|period_months_words)\s*\}\}/g

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
