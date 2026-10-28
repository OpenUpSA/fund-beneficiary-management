// Turns an LDA's flat form list into the primary → secondary → linked-report
// tree shown in the forms table. Pure, so the table can rebuild it on every
// filter/sort/expand change.

export interface TreeForm {
  id: number
  linkedFormId: number | null
  primaryFormId: number | null
  fundingStart: Date | string | null
}

export interface TreeRow<T extends TreeForm> {
  form: T
  depth: number
  /** Has children in the current (filtered) view, so it gets an expand toggle */
  hasChildren: boolean
  /** Shown only as the parent of a matching form, not because it matches itself */
  isContext: boolean
}

const time = (value: Date | string | null) => (value ? new Date(value).getTime() : Number.POSITIVE_INFINITY)

/** A linked form sits under the form it was created from; anything else under its primary form. */
function directParentId<T extends TreeForm>(form: T, byId: Map<number, T>): number | null {
  if (form.linkedFormId && form.linkedFormId !== form.id && byId.has(form.linkedFormId)) return form.linkedFormId
  if (form.primaryFormId && form.primaryFormId !== form.id && byId.has(form.primaryFormId)) return form.primaryFormId
  return null
}

/** The parent, or null when the parent chain loops back (bad data) so the form still shows at the top. */
function parentIdOf<T extends TreeForm>(form: T, byId: Map<number, T>): number | null {
  const parentId = directParentId(form, byId)
  const seen = new Set([form.id])
  for (let id = parentId; id !== null; id = directParentId(byId.get(id)!, byId)) {
    if (seen.has(id)) return null
    seen.add(id)
  }
  return parentId
}

/**
 * @param all       every form in the list (for parents of matching forms)
 * @param matching  forms matching the search/filters, in the user's sort order
 * @param collapsed ids of rows whose children are hidden
 * @param sorted    true when the user picked a sort column; otherwise primaries
 *                  are newest first and the forms under them oldest first
 */
export function buildFormTree<T extends TreeForm>(
  all: T[],
  matching: T[],
  collapsed: Set<number>,
  sorted: boolean,
): TreeRow<T>[] {
  const byId = new Map(all.map((f) => [f.id, f]))
  const matchingIds = new Set(matching.map((f) => f.id))

  // Matching forms plus their ancestors, so a matching report keeps its primary
  const rank = new Map<number, number>()
  matching.forEach((form, index) => {
    let current: T | undefined = form
    const seen = new Set<number>()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      if (!rank.has(current.id) || rank.get(current.id)! > index) rank.set(current.id, index)
      const parentId: number | null = parentIdOf(current, byId)
      current = parentId ? byId.get(parentId) : undefined
    }
  })

  const children = new Map<number | null, T[]>()
  for (const id of rank.keys()) {
    const form = byId.get(id)!
    const parentId = parentIdOf(form, byId)
    const key = parentId && rank.has(parentId) ? parentId : null
    children.set(key, [...(children.get(key) ?? []), form])
  }

  const order = (forms: T[], isRoot: boolean) =>
    [...forms].sort((a, b) =>
      sorted
        ? rank.get(a.id)! - rank.get(b.id)!
        : (isRoot ? -1 : 1) * (time(a.fundingStart) - time(b.fundingStart)) || a.id - b.id
    )

  const rows: TreeRow<T>[] = []
  const visit = (form: T, depth: number, path: Set<number>) => {
    const kids = (children.get(form.id) ?? []).filter((k) => !path.has(k.id))
    rows.push({ form, depth, hasChildren: kids.length > 0, isContext: !matchingIds.has(form.id) })
    if (collapsed.has(form.id)) return
    const nextPath = new Set(path).add(form.id)
    for (const child of order(kids, false)) visit(child, depth + 1, nextPath)
  }
  for (const root of order(children.get(null) ?? [], true)) visit(root, 0, new Set())
  return rows
}

/** "2026" for a top-level form, "Q3" for a form grouped under another. */
export function formPeriodLabel(fundingStart: Date | string | null, depth: number): string {
  if (!fundingStart) return "-"
  const date = new Date(fundingStart)
  return depth === 0 ? String(date.getUTCFullYear()) : `Q${Math.floor(date.getUTCMonth() / 3) + 1}`
}
