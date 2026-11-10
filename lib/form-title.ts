import prisma from "@/db"
import { autoFormTitle, formPeriodLabel } from "@/lib/form-tree"

// Forms get an automatic title (template name + the period the forms list shows)
// that follows the form's dates and grouping until someone changes it by hand.

const FORM_SELECT = {
  id: true,
  title: true,
  customTitle: true,
  fundingStart: true,
  linkedFormId: true,
  primaryFormId: true,
  formTemplate: { select: { name: true } },
  plannedAs: { select: { label: true } },
} as const

/** The title a form would get automatically now. */
export async function automaticTitle(formId: number): Promise<string | null> {
  const form = await prisma.localDevelopmentAgencyForm.findUnique({ where: { id: formId }, select: FORM_SELECT })
  if (!form) return null

  // Walk up to the top-level form, the same way the forms list nests rows
  let depth = 0
  let root: { fundingStart: Date } = form
  const seen = new Set([form.id])
  for (let parentId = form.linkedFormId ?? form.primaryFormId; parentId && !seen.has(parentId); depth++) {
    seen.add(parentId)
    const parent = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: parentId },
      select: { fundingStart: true, linkedFormId: true, primaryFormId: true },
    })
    if (!parent) break
    root = parent
    parentId = parent.linkedFormId ?? parent.primaryFormId
  }

  const period = formPeriodLabel(form.fundingStart, depth, root.fundingStart, form.plannedAs?.label)
  return autoFormTitle(form.formTemplate.name, period)
}

/**
 * Bring automatic titles up to date for these forms and the forms under them
 * (their quarter counts from the top form's start). Hand-set titles are left alone.
 */
export async function refreshTitles(formIds: number[]): Promise<number> {
  let changed = 0
  const seen = new Set<number>()
  let queue = [...formIds]
  while (queue.length > 0) {
    const ids = queue.filter((id) => !seen.has(id))
    ids.forEach((id) => seen.add(id))
    if (ids.length === 0) break
    for (const id of ids) {
      const form = await prisma.localDevelopmentAgencyForm.findUnique({ where: { id }, select: { title: true, customTitle: true } })
      if (!form || form.customTitle) continue
      const title = await automaticTitle(id)
      if (title && title !== form.title) {
        await prisma.localDevelopmentAgencyForm.update({ where: { id }, data: { title } })
        changed++
      }
    }
    const children = await prisma.localDevelopmentAgencyForm.findMany({
      where: { OR: [{ primaryFormId: { in: ids } }, { linkedFormId: { in: ids } }] },
      select: { id: true },
    })
    queue = children.map((c) => c.id)
  }
  return changed
}
