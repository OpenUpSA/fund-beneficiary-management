import prisma from "@/db"

/** Validate a template's `formCategoryId` from a create/update payload (null clears it). */
export async function formCategoryIdError(value: unknown): Promise<string | undefined> {
  if (value === undefined || value === null) return
  const category = Number.isInteger(value)
    ? await prisma.formCategory.findUnique({ where: { id: value as number }, select: { id: true } })
    : null
  if (!category) return "Form category not found"
}
