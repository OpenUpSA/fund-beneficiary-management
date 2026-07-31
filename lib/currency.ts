// Canonical currency handling for form values.
//
// Users type amounts with either "," or "." as the decimal separator, so
// values must be normalized before storage/maths, and always displayed the
// same way: space as the thousands separator, "." as the decimal separator
// (e.g. "12 345.67").

/**
 * Normalize a user-typed amount to a canonical numeric string ("1234.56").
 * Commas count as decimal separators; when several separators appear
 * (e.g. "1,234.56" or "1.234,56") the last one is the decimal point and the
 * rest are treated as thousands separators. Spaces and other characters are
 * stripped. Returns "" for input with no digits or separator.
 */
export function normalizeCurrencyInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(/,/g, ".")
  const lastDot = cleaned.lastIndexOf(".")
  if (lastDot === -1) return cleaned
  const intPart = cleaned.slice(0, lastDot).replace(/\./g, "")
  return `${intPart}.${cleaned.slice(lastDot + 1)}`
}

/** parseFloat that understands comma decimals and separator mixes. Returns 0 when unparseable. */
export function parseCurrency(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0
  if (typeof value === "number") return isNaN(value) ? 0 : value
  const negative = value.trim().startsWith("-")
  const num = parseFloat(normalizeCurrencyInput(value))
  if (isNaN(num)) return 0
  return negative ? -num : num
}

/** Format for display: space thousands separator, "." decimal — "12 345.67". */
export function formatCurrencyValue(
  value: number,
  { minFractionDigits = 2, maxFractionDigits = 2 }: { minFractionDigits?: number; maxFractionDigits?: number } = {}
): string {
  if (isNaN(value)) return ""
  const negative = value < 0
  let fixed = Math.abs(value).toFixed(maxFractionDigits)
  if (minFractionDigits < maxFractionDigits) {
    // Trim trailing zeros down to the minimum number of decimals
    fixed = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
    const decimals = fixed.split(".")[1]?.length ?? 0
    if (decimals < minFractionDigits) {
      fixed = Number(fixed).toFixed(minFractionDigits)
    }
  }
  const [intPart, fracPart] = fixed.split(".")
  const spaced = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${negative ? "-" : ""}${spaced}${fracPart !== undefined ? "." + fracPart : ""}`
}
