import prisma from "@/db"

// Grouping forms under a primary form (e.g. an LDA's Grant Funding Application
// for a year). Where a form sits comes from its template's *category*, never a
// template version, so next year's template needs no re-wiring: a form of a
// SECONDARY category goes under the LDA's primary form of the parent category
// whose funding period contains the form's start date.

// A rejected primary doesn't hold a period: the LDA can apply again for it
const INACTIVE_PRIMARY_STATUSES = ["Rejected"]

const CATEGORY = { select: { id: true, role: true, parentCategoryId: true } } as const

type CategoryInfo = { id: number; role: string; parentCategoryId: number | null } | null
const isPrimary = (category: CategoryInfo) => category?.role === "PRIMARY"

const primaryFormsWhere = (ldaId: number, categoryId: number) => ({
  localDevelopmentAgencyId: ldaId,
  formTemplate: { formCategoryId: categoryId, category: { role: "PRIMARY" as const } },
  formStatus: { label: { notIn: INACTIVE_PRIMARY_STATUSES } },
})

/** The LDA's primary form of the category whose funding period contains `date`. */
export async function findPrimaryForm(ldaId: number, categoryId: number, date: Date): Promise<number | null> {
  const primary = await prisma.localDevelopmentAgencyForm.findFirst({
    where: { ...primaryFormsWhere(ldaId, categoryId), fundingStart: { lte: date }, fundingEnd: { gte: date } },
    select: { id: true },
    orderBy: { fundingStart: "desc" },
  })
  return primary?.id ?? null
}

/**
 * Set a form's primary form. A linked form (e.g. DFT Report) follows its parent;
 * a form of a SECONDARY category is matched by its parent category and its start
 * date. Returns the primary form id, if any.
 */
export async function assignPrimaryForm(formId: number): Promise<number | null> {
  const form = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: formId },
    select: {
      localDevelopmentAgencyId: true,
      fundingStart: true,
      primaryFormId: true,
      formTemplate: { select: { category: CATEGORY } },
      linkedForm: { select: { id: true, primaryFormId: true, formTemplate: { select: { category: CATEGORY } } } },
    },
  })
  if (!form) return null

  let primaryFormId: number | null = null
  const category = form.formTemplate.category
  if (isPrimary(category)) {
    primaryFormId = null
  } else if (form.linkedForm) {
    primaryFormId = isPrimary(form.linkedForm.formTemplate.category) ? form.linkedForm.id : form.linkedForm.primaryFormId
  } else if (category?.role === "SECONDARY" && category.parentCategoryId) {
    primaryFormId = await findPrimaryForm(form.localDevelopmentAgencyId, category.parentCategoryId, form.fundingStart)
  }

  if (primaryFormId !== form.primaryFormId) {
    await prisma.localDevelopmentAgencyForm.update({ where: { id: formId }, data: { primaryFormId } })
    // Its linked forms (e.g. the DFT Report of a DFT Application) move with it
    await prisma.localDevelopmentAgencyForm.updateMany({ where: { linkedFormId: formId }, data: { primaryFormId } })
  }
  return primaryFormId
}

/**
 * After a primary form is created or its dates change: re-check the forms
 * grouped under it, then attach the LDA's ungrouped forms that fall in its period.
 */
export async function attachSecondaryForms(primaryFormId: number): Promise<void> {
  const primary = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: primaryFormId },
    select: {
      localDevelopmentAgencyId: true,
      fundingStart: true,
      fundingEnd: true,
      formTemplate: { select: { category: CATEGORY } },
    },
  })
  const category = primary?.formTemplate.category
  if (!primary || !category || !isPrimary(category)) return

  // Forms that may have fallen outside a changed period move elsewhere (or nowhere)
  const grouped = await prisma.localDevelopmentAgencyForm.findMany({
    where: { primaryFormId, linkedFormId: null },
    select: { id: true },
  })
  for (const { id } of grouped) await assignPrimaryForm(id)

  const attached = await prisma.localDevelopmentAgencyForm.findMany({
    where: {
      localDevelopmentAgencyId: primary.localDevelopmentAgencyId,
      primaryFormId: null,
      linkedFormId: null,
      formTemplate: { category: { role: "SECONDARY", parentCategoryId: category.id } },
      fundingStart: { gte: primary.fundingStart, lte: primary.fundingEnd },
    },
    select: { id: true },
  })
  const attachedIds = attached.map((f) => f.id)
  if (attachedIds.length > 0) {
    await prisma.localDevelopmentAgencyForm.updateMany({ where: { id: { in: attachedIds } }, data: { primaryFormId } })
  }

  // Linked forms (reports of the primary or of the forms just attached) follow their parent
  await prisma.localDevelopmentAgencyForm.updateMany({
    where: { linkedFormId: { in: [primaryFormId, ...attachedIds] }, primaryFormId: null },
    data: { primaryFormId },
  })
}

/** Group a form after it is created or its dates change: as a primary or as a secondary. */
export async function placeForm(formId: number): Promise<void> {
  const form = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: formId },
    select: { formTemplate: { select: { category: CATEGORY } } },
  })
  if (!form) return
  if (isPrimary(form.formTemplate.category)) await attachSecondaryForms(formId)
  else await assignPrimaryForm(formId)
}

export interface RegroupChange {
  id: number
  title: string
  from: number | null
  to: number | null
}

/**
 * Work out where every form belongs, from scratch — used when categories or a
 * template's category change, and by the backfill script. Returns only the forms that would move.
 */
export async function planRegroup(): Promise<RegroupChange[]> {
  const forms = await prisma.localDevelopmentAgencyForm.findMany({
    select: {
      id: true,
      title: true,
      localDevelopmentAgencyId: true,
      fundingStart: true,
      fundingEnd: true,
      primaryFormId: true,
      linkedFormId: true,
      formStatus: { select: { label: true } },
      formTemplate: { select: { category: CATEGORY } },
    },
  })
  type Row = (typeof forms)[number]
  const byId = new Map(forms.map((f) => [f.id, f]))
  const primaries = forms
    .filter((f) => isPrimary(f.formTemplate.category) && !INACTIVE_PRIMARY_STATUSES.includes(f.formStatus.label))
    .sort((a, b) => b.fundingStart.getTime() - a.fundingStart.getTime())

  const targets = new Map<number, number | null>()
  const resolve = (form: Row, depth = 0): number | null => {
    const known = targets.get(form.id)
    if (known !== undefined) return known
    let target: number | null = null
    const parent = form.linkedFormId ? byId.get(form.linkedFormId) : undefined
    const category = form.formTemplate.category
    if (isPrimary(category)) {
      target = null
    } else if (parent && depth < 10) {
      target = isPrimary(parent.formTemplate.category) ? parent.id : resolve(parent, depth + 1)
    } else if (category?.role === "SECONDARY" && category.parentCategoryId) {
      const primary = primaries.find((p) =>
        p.localDevelopmentAgencyId === form.localDevelopmentAgencyId &&
        p.formTemplate.category?.id === category.parentCategoryId &&
        p.fundingStart <= form.fundingStart &&
        p.fundingEnd >= form.fundingStart
      )
      target = primary?.id ?? null
    }
    targets.set(form.id, target)
    return target
  }

  return forms
    .map((f) => ({ id: f.id, title: f.title, from: f.primaryFormId, to: resolve(f) }))
    .filter((change) => change.from !== change.to)
}

/** Save the moves from `planRegroup`. */
export async function applyRegroup(changes: RegroupChange[]): Promise<void> {
  await prisma.$transaction(
    changes.map(({ id, to }) => prisma.localDevelopmentAgencyForm.update({ where: { id }, data: { primaryFormId: to } }))
  )
}

/** Error when another primary form of the same category overlaps the given period for this LDA. */
export async function primaryOverlapError(
  ldaId: number,
  categoryId: number,
  start: Date,
  end: Date,
  excludeFormId?: number,
): Promise<string | undefined> {
  const clash = await prisma.localDevelopmentAgencyForm.findFirst({
    where: {
      ...primaryFormsWhere(ldaId, categoryId),
      ...(excludeFormId && { id: { not: excludeFormId } }),
      fundingStart: { lte: end },
      fundingEnd: { gte: start },
    },
    select: { title: true },
  })
  if (clash) return `"${clash.title}" already covers these dates. Primary forms of the same kind can't overlap.`
}
