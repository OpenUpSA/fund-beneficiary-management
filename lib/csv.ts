/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, embedded commas,
 * embedded newlines, and escaped double-quotes (""). Returns an array of
 * objects keyed by the (trimmed) header row.
 *
 * Used by the admin bulk-upload tools — kept dependency-free on purpose.
 */
export function parseCsv(input: string): Record<string, string>[] {
  const rows = parseCsvRows(input)
  if (rows.length === 0) return []

  const headers = rows[0].map((h) => h.trim())
  const records: Record<string, string>[] = []

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    // Skip fully empty lines (common trailing newline in exported files).
    if (cells.length === 1 && cells[0].trim() === '') continue

    const record: Record<string, string> = {}
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? '').trim()
    })
    records.push(record)
  }

  return records
}

/** Parse raw CSV text into a 2D array of string cells. */
function parseCsvRows(input: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  // Normalise line endings.
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++ // skip the escaped quote
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  // Flush the final field/row (file may not end with a newline).
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/**
 * Case-insensitive column lookup. Tries each candidate header (ignoring case
 * and whitespace) and returns the first non-empty value found.
 */
export function pickField(row: Record<string, string>, keys: string[]): string {
  const normalized = Object.keys(row).reduce<Record<string, string>>((acc, k) => {
    acc[k.toLowerCase().replace(/\s+/g, "")] = row[k]
    return acc
  }, {})
  for (const key of keys) {
    const v = normalized[key.toLowerCase().replace(/\s+/g, "")]
    if (v !== undefined && v !== null && v !== "") return v
  }
  return ""
}

/** Interpret a free-text yes/no value (e.g. from a "Send Email" column). */
export function parseBooleanFlag(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === "yes" || v === "true" || v === "1" || v === "y"
}

/** Header aliases recognised for the optional per-row "Send Email" column. */
export const SEND_EMAIL_HEADERS = ["Send Email", "SendEmail", "Email Invite"]

/** Returns true if any of the given headers is a recognised Send Email column. */
export function hasSendEmailColumn(headers: string[]): boolean {
  const normalized = SEND_EMAIL_HEADERS.map((h) => h.toLowerCase().replace(/\s+/g, ""))
  return headers.some((h) => normalized.includes(h.toLowerCase().replace(/\s+/g, "")))
}

/** Split a cell that may contain multiple emails separated by ; or ,. */
export function splitEmails(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}
