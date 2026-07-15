// Attributes reporting-indicator keyword matches to the form section (and field)
// they occur in, and extracts short highlighted context snippets.
//
// The dashboard "Reporting" search matches phrases against the whole `formData`
// JSONB blob in SQL, so it knows a report matched but not *where*. These pure
// helpers re-read a report's `formData` against its `FormTemplate.form` to work
// out which section(s) and field(s) each indicator's phrases appear in, for the
// small set of reports actually shown in the UI.
//
// Section identity is the section's array index in `form.sections` — the same
// value the report renderer uses for its accordion (`section-${index}`). Field
// identity is the field `name`, used as the report's per-field anchor
// (`field-${name}`). Both are stable because hidden sections/fields null-render
// without shifting the identities of the rest.

import type { Form, FormData, Field } from "@/types/forms"

interface FieldSectionEntry {
  fieldName: string
  fieldLabel: string
  sectionIndex: number
}

/** ~chars of context shown on each side of a matched phrase in a snippet. */
const SNIPPET_CONTEXT = 45
/** Cap snippets per section so the API payload stays small. */
const MAX_SNIPPETS_PER_SECTION = 6

/**
 * Every field name in the template paired with its label and owning top-level
 * section index, recursing into `group` (`fields`) and `repeatable` (`template`)
 * children since composite formData keys derive from those child names.
 *
 * Sorted longest-name-first so key resolution prefers the most specific field
 * when one field name is a prefix of another.
 */
export function buildFieldSectionIndex(form: Form): FieldSectionEntry[] {
  const entries: FieldSectionEntry[] = []

  const walk = (fields: Field[] | undefined, sectionIndex: number) => {
    for (const field of fields ?? []) {
      if (field.name) {
        entries.push({ fieldName: field.name, fieldLabel: field.label ?? field.name, sectionIndex })
      }
      if (field.fields) walk(field.fields, sectionIndex)
      if (field.template) walk(field.template, sectionIndex)
    }
  }

  form.sections?.forEach((section, sectionIndex) => walk(section.fields, sectionIndex))

  // Longest field name first → most specific match wins in prefix resolution.
  entries.sort((a, b) => b.fieldName.length - a.fieldName.length)
  return entries
}

/**
 * Resolve a flat `formData` key to its owning field entry. Exact match wins;
 * otherwise the longest field name `F` such that `key === F` or `key` starts
 * with `F_` (the prefix under which group/repeatable sub-answers are stored).
 */
export function resolveFieldForKey(key: string, index: FieldSectionEntry[]): FieldSectionEntry | null {
  for (const entry of index) {
    if (key === entry.fieldName || key.startsWith(entry.fieldName + "_")) return entry
  }
  return null
}

export interface MatchSnippet {
  /** Field the match sits in — deep-links to `field-${fieldName}` in the report. */
  fieldName: string
  fieldLabel: string
  /** Context split around the match so the client can wrap `match` in <mark>. */
  before: string
  match: string
  after: string
  /** Whether context was clipped, so the UI can show a leading/trailing ellipsis. */
  clippedStart: boolean
  clippedEnd: boolean
}

export interface AttributedSection {
  index: number
  title: string
  /** Total phrase occurrences in the section (may exceed the number of snippets). */
  count: number
  snippets: MatchSnippet[]
}

/** Non-overlapping match positions of any phrase in `lowerText`. */
function findMatches(lowerText: string, phrases: string[]): { start: number; len: number }[] {
  const found: { start: number; len: number }[] = []
  for (const phrase of phrases) {
    if (!phrase) continue
    let from = 0
    for (;;) {
      const at = lowerText.indexOf(phrase, from)
      if (at === -1) break
      found.push({ start: at, len: phrase.length })
      from = at + phrase.length
    }
  }
  // Sort by position and drop overlaps (a longer variant containing a shorter one).
  found.sort((a, b) => a.start - b.start || b.len - a.len)
  const deduped: { start: number; len: number }[] = []
  let lastEnd = -1
  for (const m of found) {
    if (m.start >= lastEnd) {
      deduped.push(m)
      lastEnd = m.start + m.len
    }
  }
  return deduped
}

/**
 * Total deduplicated phrase occurrences in a report's attributable field values.
 * Overlapping variant matches (e.g. "accountability action" inside "accountability
 * actions taken") count once — unlike the whole-blob SQL sum, which counts each
 * variant separately. Used to make the indicator/report/section counts consistent.
 */
export function countOccurrences(
  form: Form,
  formData: FormData,
  phrases: string[],
  prebuiltIndex?: FieldSectionEntry[],
): number {
  if (!form?.sections?.length) return 0
  const fieldIndex = prebuiltIndex ?? buildFieldSectionIndex(form)

  let total = 0
  for (const [key, value] of Object.entries(formData ?? {})) {
    if (value === null || value === undefined) continue
    if (!resolveFieldForKey(key, fieldIndex)) continue
    total += findMatches(String(value).toLowerCase(), phrases).length
  }
  return total
}

/** One-line context excerpt around a match, using the original-cased value. */
function makeSnippet(value: string, start: number, len: number, entry: FieldSectionEntry): MatchSnippet {
  const rawBefore = value.slice(Math.max(0, start - SNIPPET_CONTEXT), start)
  const rawAfter = value.slice(start + len, start + len + SNIPPET_CONTEXT)
  const collapse = (s: string) => s.replace(/\s+/g, " ").trim()
  return {
    fieldName: entry.fieldName,
    fieldLabel: entry.fieldLabel,
    before: collapse(rawBefore),
    match: value.slice(start, start + len),
    after: collapse(rawAfter),
    clippedStart: start - SNIPPET_CONTEXT > 0,
    clippedEnd: start + len + SNIPPET_CONTEXT < value.length,
  }
}

/**
 * For one report, find every occurrence of the indicator's phrases, grouped by
 * section, with context snippets. Returns only sections with ≥1 occurrence, in
 * section order. May be empty even when the SQL blob search matched the report
 * (e.g. the phrase only appears in a field name, spans JSON punctuation, or sits
 * under a key we couldn't resolve) — callers must treat that as valid.
 */
export function attributeSections(
  form: Form,
  formData: FormData,
  phrases: string[],
  /** Prebuilt via buildFieldSectionIndex(form); pass it to avoid rebuilding per report. */
  prebuiltIndex?: FieldSectionEntry[],
): AttributedSection[] {
  if (!form?.sections?.length) return []

  const fieldIndex = prebuiltIndex ?? buildFieldSectionIndex(form)

  const bySection = new Map<number, { count: number; snippets: MatchSnippet[] }>()

  for (const [key, value] of Object.entries(formData ?? {})) {
    if (value === null || value === undefined) continue
    const entry = resolveFieldForKey(key, fieldIndex)
    if (!entry) continue

    const text = String(value)
    const matches = findMatches(text.toLowerCase(), phrases)
    if (matches.length === 0) continue

    const bucket = bySection.get(entry.sectionIndex) ?? { count: 0, snippets: [] }
    bucket.count += matches.length
    for (const m of matches) {
      if (bucket.snippets.length >= MAX_SNIPPETS_PER_SECTION) break
      bucket.snippets.push(makeSnippet(text, m.start, m.len, entry))
    }
    bySection.set(entry.sectionIndex, bucket)
  }

  const results: AttributedSection[] = []
  for (const [sectionIndex, { count, snippets }] of bySection) {
    results.push({
      index: sectionIndex,
      title: form.sections[sectionIndex]?.title ?? `Section ${sectionIndex + 1}`,
      count,
      snippets,
    })
  }
  results.sort((a, b) => a.index - b.index)
  return results
}
