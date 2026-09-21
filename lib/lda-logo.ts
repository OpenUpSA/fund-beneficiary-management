export const LDA_LOGO_MAX_BYTES = 5 * 1024 * 1024
export const LDA_LOGO_ACCEPT = "image/png,image/jpeg,image/webp"

export function logoFileError(file: { size: number; type: string }): string | undefined {
  if (!LDA_LOGO_ACCEPT.split(",").includes(file.type)) {
    return "Choose a PNG, JPEG or WebP image."
  }
  if (file.size === 0) return "The logo file is empty."
  if (file.size > LDA_LOGO_MAX_BYTES) return "The logo must be 5 MB or smaller."
}

// Check the contents too: a filename and MIME type alone do not identify an image.
export function hasLogoSignature(bytes: Uint8Array, type: string): boolean {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value)

  switch (type) {
    case "image/png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case "image/jpeg":
      return startsWith([0xff, 0xd8, 0xff])
    case "image/webp":
      return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)
    default:
      return false
  }
}
