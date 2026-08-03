// Run with: npx tsx scripts/tests/field-completeness.test.ts
import assert from "node:assert/strict"
import {
  isScalarValueComplete,
  isFieldComplete,
  computeGroupValidity,
} from "../../lib/form-validation/field-completeness"
import type { Field } from "../../types/forms"

const field = (overrides: Partial<Field>): Field =>
  ({ name: "f", type: "text", label: "F", ...overrides } as Field)

// --- isScalarValueComplete ---
assert.equal(isScalarValueComplete("hello"), true)
assert.equal(isScalarValueComplete("  "), false)
assert.equal(isScalarValueComplete(""), false)
assert.equal(isScalarValueComplete('["file.pdf"]', "fileUpload"), true)
assert.equal(isScalarValueComplete("[]", "fileUpload"), false)
assert.equal(isScalarValueComplete("", "fileUpload"), false)
assert.equal(isScalarValueComplete("not-json", "fileUpload"), false)

// --- isFieldComplete: scalars ---
assert.equal(isFieldComplete(field({ required: true, value: "x" })), true)
assert.equal(isFieldComplete(field({ required: true, value: "" })), false)
assert.equal(isFieldComplete(field({ required: true })), false, "required without value")
assert.equal(isFieldComplete(field({ required: false })), true, "optional passes")
assert.equal(isFieldComplete(field({ required: true, show: false })), true, "hidden passes")
assert.equal(isFieldComplete(field({ required: true, type: "info" })), true, "info passes")

// --- isFieldComplete: groups (no scalar value of their own) ---
const attendanceGroup = (childValues: Array<string | undefined>): Field =>
  field({
    name: "overall_attendance",
    type: "group",
    required: true,
    fields: childValues.map((v, i) =>
      field({ name: `n${i}`, type: "number", required: true, value: v })
    ),
  })
assert.equal(isFieldComplete(attendanceGroup(["1", "2", "3"])), true, "filled group complete")
assert.equal(isFieldComplete(attendanceGroup(["1", "", "3"])), false, "empty child incomplete")
assert.equal(isFieldComplete(attendanceGroup(["1", undefined, "3"])), false)
assert.equal(
  isFieldComplete(field({ type: "group", required: false, fields: [field({ required: true, value: "" })] })),
  true,
  "optional group passes"
)
assert.equal(
  isFieldComplete(field({ type: "group", required: true, show: false, fields: [field({ required: true, value: "" })] })),
  true,
  "hidden group passes"
)
// group whose empty child is hidden is complete
assert.equal(
  isFieldComplete(
    field({
      type: "group",
      required: true,
      fields: [field({ required: true, value: "1" }), field({ required: true, value: "", show: false })],
    })
  ),
  true
)

// --- computeGroupValidity (isValid-based) ---
const validityGroup = (children: Array<Partial<Field>>): Field =>
  field({ type: "group", required: true, fields: children.map((c, i) => field({ name: `c${i}`, ...c })) })
assert.equal(computeGroupValidity(validityGroup([{ required: true, isValid: true }])), true)
assert.equal(computeGroupValidity(validityGroup([{ required: true, isValid: false }])), false)
assert.equal(computeGroupValidity(validityGroup([{ required: true, isValid: undefined }])), false, "undefined isValid counts invalid")
assert.equal(computeGroupValidity(validityGroup([{ required: false, isValid: false }])), true, "optional child ignored")
assert.equal(computeGroupValidity(validityGroup([{ required: true, isValid: false, show: false }])), true, "hidden child ignored")
assert.equal(computeGroupValidity(field({ type: "group" })), true, "no children = valid")

console.log("field-completeness: all assertions passed")
