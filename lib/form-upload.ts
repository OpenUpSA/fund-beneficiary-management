// Files accepted by form-template uploads (and the document API). Deliberately an
// allowlist of everyday office/image formats: no SVG, HTML, scripts, archives or
// executables, since those can carry active content.
export const FORM_UPLOAD_MAX_BYTES = 20 * 1024 * 1024
export const FORM_UPLOAD_MAX_LABEL = "20 MB"

type Signature = "pdf" | "png" | "jpeg" | "gif" | "webp" | "heif" | "ole" | "zip" | "text"

interface AllowedType {
  label: string
  mimeTypes: string[]
  signature: Signature
}

// Keyed by extension: browsers often report an empty or generic MIME type
// (HEIC photos, CSVs on Windows), so the extension decides the type.
const ALLOWED_TYPES: Record<string, AllowedType> = {
  pdf: { label: "PDF", mimeTypes: ["application/pdf"], signature: "pdf" },
  png: { label: "PNG", mimeTypes: ["image/png"], signature: "png" },
  jpg: { label: "JPG", mimeTypes: ["image/jpeg", "image/jpg"], signature: "jpeg" },
  jpeg: { label: "JPEG", mimeTypes: ["image/jpeg", "image/jpg"], signature: "jpeg" },
  gif: { label: "GIF", mimeTypes: ["image/gif"], signature: "gif" },
  webp: { label: "WEBP", mimeTypes: ["image/webp"], signature: "webp" },
  heic: { label: "HEIC", mimeTypes: ["image/heic", "image/heif"], signature: "heif" },
  heif: { label: "HEIF", mimeTypes: ["image/heif", "image/heic"], signature: "heif" },
  doc: { label: "DOC", mimeTypes: ["application/msword"], signature: "ole" },
  docx: { label: "DOCX", mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], signature: "zip" },
  xls: { label: "XLS", mimeTypes: ["application/vnd.ms-excel"], signature: "ole" },
  xlsx: { label: "XLSX", mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], signature: "zip" },
  ppt: { label: "PPT", mimeTypes: ["application/vnd.ms-powerpoint"], signature: "ole" },
  pptx: { label: "PPTX", mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], signature: "zip" },
  odt: { label: "ODT", mimeTypes: ["application/vnd.oasis.opendocument.text"], signature: "zip" },
  ods: { label: "ODS", mimeTypes: ["application/vnd.oasis.opendocument.spreadsheet"], signature: "zip" },
  odp: { label: "ODP", mimeTypes: ["application/vnd.oasis.opendocument.presentation"], signature: "zip" },
  csv: { label: "CSV", mimeTypes: ["text/csv", "application/vnd.ms-excel", "text/plain"], signature: "text" },
  txt: { label: "TXT", mimeTypes: ["text/plain"], signature: "text" },
}

// MIME types a browser sends when it doesn't know the file; the extension still applies.
const GENERIC_MIME_TYPES = ["", "application/octet-stream"]

export const FORM_UPLOAD_MIME_TYPES = [...new Set(Object.values(ALLOWED_TYPES).flatMap(t => t.mimeTypes))]

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".")
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase()
}

const allowedEntries = (mimeTypes: string[]) =>
  Object.entries(ALLOWED_TYPES).filter(([, t]) => t.mimeTypes.some(m => mimeTypes.includes(m)))

// Value for <input accept>: extensions as well as MIME types, so files the
// browser can't type (e.g. HEIC) are still selectable.
export const formUploadAccept = (mimeTypes: string[] = FORM_UPLOAD_MIME_TYPES): string =>
  [
    ...allowedEntries(mimeTypes).map(([ext]) => `.${ext}`),
    ...mimeTypes.filter(m => FORM_UPLOAD_MIME_TYPES.includes(m)),
  ].join(",")

export const describeAllowedTypes = (mimeTypes: string[] = FORM_UPLOAD_MIME_TYPES): string =>
  [...new Set(allowedEntries(mimeTypes).map(([, t]) => t.label))].join(", ")

/**
 * Checks name, type and size. `allowedMimeTypes` lets a template narrow the
 * list further; it can never widen it beyond ALLOWED_TYPES.
 */
export function formUploadFileError(
  file: { name: string; size: number; type: string },
  allowedMimeTypes: string[] = FORM_UPLOAD_MIME_TYPES,
): string | undefined {
  const allowed = ALLOWED_TYPES[extensionOf(file.name)]
  const mimeOk = allowed && (GENERIC_MIME_TYPES.includes(file.type) || allowed.mimeTypes.includes(file.type))
  if (!allowed || !mimeOk || !allowed.mimeTypes.some(m => allowedMimeTypes.includes(m))) {
    return `${file.name}: file type not allowed. Allowed types: ${describeAllowedTypes(allowedMimeTypes)}.`
  }
  if (file.size === 0) return `${file.name} is empty.`
  if (file.size > FORM_UPLOAD_MAX_BYTES) return `${file.name} is larger than ${FORM_UPLOAD_MAX_LABEL}.`
}

// Check the contents too: a renamed executable must not pass as a document.
export function hasFormUploadSignature(bytes: Uint8Array, name: string): boolean {
  const allowed = ALLOWED_TYPES[extensionOf(name)]
  if (!allowed) return false
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value)

  switch (allowed.signature) {
    case "pdf":
      return startsWith([0x25, 0x50, 0x44, 0x46]) // %PDF
    case "png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case "jpeg":
      return startsWith([0xff, 0xd8, 0xff])
    case "gif":
      return startsWith([0x47, 0x49, 0x46, 0x38]) // GIF8
    case "webp":
      return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)
    case "heif":
      return startsWith([0x66, 0x74, 0x79, 0x70], 4) // ftyp box
    case "ole":
      return startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    case "zip":
      return startsWith([0x50, 0x4b, 0x03, 0x04])
    case "text":
      // Plain text has no magic number; binary content shows up as NUL bytes
      return !bytes.subarray(0, 8192).includes(0)
  }
}
