// Derive avatar initials from a user's name.
// "Anastacia Smith" -> "AS"; single word -> first two letters; empty -> "?".
export function getInitials(name?: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Build a displayable URL from a stored ImageKit filePath.
// Returns undefined when there's no avatar so the Avatar falls back to initials.
// Passes through values that are already absolute URLs.
export function avatarUrl(filePath?: string | null): string | undefined {
  if (!filePath) return undefined
  if (/^https?:\/\//.test(filePath)) return filePath
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  if (!endpoint) return undefined
  return `${endpoint.replace(/\/$/, "")}/${filePath.replace(/^\//, "")}`
}
