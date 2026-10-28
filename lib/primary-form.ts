import prisma from "@/db"

// Grouping forms under a primary form (e.g. an LDA's Grant Funding Application
// for a year). Templates point at a *category*, not a template version, so a
// yearly clone of the primary template needs no re-wiring: a secondary form goes
// under the LDA's primary form of that category whose funding period contains
// the secondary form's start date.

// A rejected primary doesn't hold a period: the LDA can apply again for it
const INACTIVE_PRIMARY_STATUSES = ["Rejected"]

const primaryFormsWhere = (ldaId: number, category: string) => ({
  localDevelopmentAgencyId: ldaId,
  formTemplate: { isPrimary: true, formCategory: category },
  formStatus: { label: { notIn: INACTIVE_PRIMARY_STATUSES } },
})

/** The LDA's primary form of `category` whose funding period contains `date`. */
export async function findPrimaryForm(ldaId: number, category: string, date: Date): Promise<number | null> {
  const primary = await prisma.localDevelopmentAgencyForm.findFirst({
    where: { ...primaryFormsWhere(ldaId, category), fundingStart: { lte: date }, fundingEnd: { gte: date } },
    select: { id: true },
    orderBy: { fundingStart: "desc" },
  })
  return primary?.id ?? null
}

/**
 * Set a secondary form's primary form. A linked form (e.g. DFT Report) follows
 * its parent; anything else is matched by its template's primary category and
 * its start date. Returns the primary form id, if any.
 */
export async function assignPrimaryForm(formId: number): Promise<number | null> {
  const form = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: formId },
    select: {
      localDevelopmentAgencyId: true,
      fundingStart: true,
      primaryFormId: true,
      formTemplate: { select: { isPrimary: true, primaryCategory: true } },
      linkedForm: { select: { id: true, primaryFormId: true, formTemplate: { select: { isPrimary: true } } } },
    },
  })
  if (!form || form.formTemplate.isPrimary) return null

  let primaryFormId: number | null = null
  if (form.linkedForm) {
    primaryFormId = form.linkedForm.formTemplate.isPrimary ? form.linkedForm.id : form.linkedForm.primaryFormId
  } else if (form.formTemplate.primaryCategory) {
    primaryFormId = await findPrimaryForm(form.localDevelopmentAgencyId, form.formTemplate.primaryCategory, form.fundingStart)
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
      formTemplate: { select: { isPrimary: true, formCategory: true } },
    },
  })
  const category = primary?.formTemplate.formCategory
  if (!primary || !primary.formTemplate.isPrimary || !category) return

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
      formTemplate: { isPrimary: false, primaryCategory: category },
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
    select: { formTemplate: { select: { isPrimary: true } } },
  })
  if (!form) return
  if (form.formTemplate.isPrimary) await attachSecondaryForms(formId)
  else await assignPrimaryForm(formId)
}

/** Error when another primary form of the same category overlaps the given period for this LDA. */
export async function primaryOverlapError(
  ldaId: number,
  category: string,
  start: Date,
  end: Date,
  excludeFormId?: number,
): Promise<string | undefined> {
  const clash = await prisma.localDevelopmentAgencyForm.findFirst({
    where: {
      ...primaryFormsWhere(ldaId, category),
      ...(excludeFormId && { id: { not: excludeFormId } }),
      fundingStart: { lte: end },
      fundingEnd: { gte: start },
    },
    select: { title: true },
  })
  if (clash) return `"${clash.title}" already covers these dates. Primary forms of the same kind can't overlap.`
}

/** Validate the primary-form settings on a template create/update payload. */
export function primaryFormSettingsError(data: {
  isPrimary?: unknown
  primaryCategory?: unknown
  formCategory?: unknown
}): string | undefined {
  if (data.isPrimary !== undefined && typeof data.isPrimary !== "boolean") return "Primary form must be true or false"
  if (data.primaryCategory != null && typeof data.primaryCategory !== "string") return "Primary category must be text"
  if (data.isPrimary === true) {
    if (!data.formCategory) return "A primary form template needs a form category"
    if (data.primaryCategory) return "A primary form template can't also be grouped under another primary"
  }
}
