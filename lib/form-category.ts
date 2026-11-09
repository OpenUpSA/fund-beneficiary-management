import prisma from "@/db"

export const FORM_CATEGORY_ROLES = ["PRIMARY", "SECONDARY", "REPORT"] as const
export type FormCategoryRoleValue = (typeof FORM_CATEGORY_ROLES)[number]

/** Validate a template's `formCategoryId` from a create/update payload (null clears it). */
export async function formCategoryIdError(value: unknown): Promise<string | undefined> {
  if (value === undefined || value === null) return
  const category = Number.isInteger(value)
    ? await prisma.formCategory.findUnique({ where: { id: value as number }, select: { id: true } })
    : null
  if (!category) return "Form category not found"
}

export interface FormCategoryInput {
  key?: unknown
  label?: unknown
  role?: unknown
  parentCategoryId?: unknown
  active?: unknown
}

/**
 * Validate a category create (`existing` undefined) or update payload. The key
 * is fixed after creation because code looks categories up by it.
 */
export async function formCategoryInputError(
  data: FormCategoryInput,
  existing?: { id: number; role: string; parentCategoryId: number | null },
): Promise<string | undefined> {
  if (!existing) {
    if (typeof data.key !== "string" || !/^[a-z][a-z0-9_]*$/.test(data.key)) {
      return "Key must start with a letter and use only lowercase letters, numbers and underscores"
    }
    if (await prisma.formCategory.findUnique({ where: { key: data.key }, select: { id: true } })) {
      return "A category with this key already exists"
    }
  } else if (data.key !== undefined) {
    return "A category's key can't be changed"
  }

  if ((!existing || data.label !== undefined) && (typeof data.label !== "string" || !data.label.trim())) {
    return "Label is required"
  }
  if ((!existing || data.role !== undefined) && !FORM_CATEGORY_ROLES.includes(data.role as FormCategoryRoleValue)) {
    return "Role must be primary, secondary or report"
  }
  if (data.active !== undefined && typeof data.active !== "boolean") return "Active must be true or false"

  const role = (data.role ?? existing?.role) as FormCategoryRoleValue
  const parentId = data.parentCategoryId !== undefined ? data.parentCategoryId : existing?.parentCategoryId ?? null
  if (parentId === null) return
  if (role !== "SECONDARY") return "Only secondary categories sit under a primary category"
  if (!Number.isInteger(parentId) || parentId === existing?.id) return "Choose a primary category to sit under"
  const parent = await prisma.formCategory.findUnique({ where: { id: parentId as number }, select: { role: true } })
  if (parent?.role !== "PRIMARY") return "A secondary category must sit under a primary category"
}
