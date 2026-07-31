// Sanitize typed input for form-template number fields. Negative values are
// blocked unless the field's template config sets `allow_negative: true`
// (matching the digits-only behaviour the custom grid/count layouts already
// enforce). Allows one decimal point; when negatives are allowed, one leading
// minus sign.
export function sanitizeNumberInput(raw: string, allowNegative = false): string {
  let value = raw.replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, "")
  if (allowNegative) {
    // Keep only a single leading minus
    value = value.charAt(0) + value.slice(1).replace(/-/g, "")
    if (value === "-.") value = "-"
  }
  // Keep only the first decimal point
  const firstDot = value.indexOf(".")
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, "")
  }
  return value
}

export function fieldAllowsNegative(config?: Record<string, unknown>): boolean {
  return config?.allow_negative === true
}
