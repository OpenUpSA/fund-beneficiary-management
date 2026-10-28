// Run with: node -r tsx/cjs scripts/tests/form-tree.test.ts
import assert from "node:assert/strict"
import { buildFormTree, formPeriodLabel, type TreeForm } from "../../lib/form-tree"

const form = (id: number, start: string, parents: { linked?: number; primary?: number } = {}): TreeForm => ({
  id,
  fundingStart: `${start}T00:00:00.000Z`,
  linkedFormId: parents.linked ?? null,
  primaryFormId: parents.primary ?? null,
})

// Two primaries (2026, 2027); under 2026 a DFT Application with its DFT Report, plus a scheduled report
const all = [
  form(1, "2026-01-01"),
  form(2, "2027-01-01"),
  form(10, "2026-10-02", { primary: 1 }),
  form(11, "2026-04-15", { linked: 1, primary: 1 }),
  form(20, "2026-10-02", { linked: 10, primary: 1 }),
  form(30, "2026-05-01"), // ungrouped
  form(40, "2027-03-01", { primary: 99 }), // primary not in this list
]
const shape = (rows: ReturnType<typeof buildFormTree>) => rows.map((r) => [r.form.id, r.depth, r.hasChildren, r.isContext])

// Default order: top level newest first, forms under a primary oldest first; linked forms under their parent
assert.deepEqual(shape(buildFormTree(all, all, new Set(), false)), [
  [40, 0, false, false],
  [2, 0, false, false],
  [30, 0, false, false],
  [1, 0, true, false],
  [11, 1, false, false],
  [10, 1, true, false],
  [20, 2, false, false],
])

// Collapsing hides the whole subtree
assert.deepEqual(buildFormTree(all, all, new Set([1]), false).map((r) => r.form.id), [40, 2, 30, 1])
assert.deepEqual(buildFormTree(all, all, new Set([10]), false).map((r) => r.form.id), [40, 2, 30, 1, 11, 10])

// Filtering to the DFT Report keeps its parents as context rows
assert.deepEqual(shape(buildFormTree(all, [all[4]], new Set(), false)), [
  [1, 0, true, true],
  [10, 1, true, true],
  [20, 2, false, false],
])

// A user-chosen sort keeps that order at every level (parents follow their first matching child)
const sortedMatches = [all[4], all[1], all[0], all[3]] // 20, 2, 1, 11
assert.deepEqual(buildFormTree(all, sortedMatches, new Set(), true).map((r) => [r.form.id, r.depth]), [
  [1, 0], [10, 1], [20, 2], [11, 1], [2, 0],
])

// Self-references never loop
const looped = [{ id: 5, fundingStart: null, linkedFormId: 5, primaryFormId: null }]
assert.deepEqual(buildFormTree(looped, looped, new Set(), false).map((r) => r.form.id), [5])
const cycle = [form(6, "2026-01-01", { linked: 7 }), form(7, "2026-02-01", { linked: 6 })]
assert.deepEqual(buildFormTree(cycle, cycle, new Set(), false).map((r) => r.form.id).sort(), [6, 7], "Forms in a loop still show")

// Year for top-level rows, quarter for grouped rows
assert.equal(formPeriodLabel("2026-01-01T00:00:00.000Z", 0), "2026")
assert.equal(formPeriodLabel("2026-10-02T00:00:00.000Z", 1), "Q4")
assert.equal(formPeriodLabel("2026-03-31T00:00:00.000Z", 2), "Q1")
assert.equal(formPeriodLabel(null, 0), "-")

console.log("form-tree: grouping, default and user sort order, collapsing, filter context and period labels passed")
