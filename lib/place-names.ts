// Province/district values are stored as lowercase hyphenated codes
// ("eastern-cape", "buffalo-city"). Turn a code into its display name.
// Values that already contain uppercase are assumed to be display text
// (e.g. free-text entries on multi-country deployments) and pass through.

const PLACE_NAME_EXCEPTIONS: Record<string, string> = {
  'kwazulu-natal': 'KwaZulu-Natal',
}

export function displayPlaceName(code?: string | null): string {
  if (!code) return ''
  const trimmed = code.trim()
  const key = trimmed.toLowerCase()
  if (PLACE_NAME_EXCEPTIONS[key]) return PLACE_NAME_EXCEPTIONS[key]
  if (trimmed !== key) return trimmed // already display text
  return key
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
