// Run with: node -r tsx/cjs scripts/tests/form-period-dates.test.ts
import assert from "node:assert/strict"
import { formPeriodDateForPicker, normalizeToUtcDay, serializeFormPeriodDate } from "../../lib/form-period-dates"
import { buildPlaceholderValues, substituteTemplatePlaceholders } from "../../lib/template-placeholders"

const timeZones = ["UTC", "Asia/Kolkata", "Africa/Johannesburg", "America/Los_Angeles", "Pacific/Kiritimati"]
const originalTZ = process.env.TZ

try {
  for (const browserTZ of timeZones) {
    process.env.TZ = browserTZ
    const start = serializeFormPeriodDate(new Date(2027, 0, 1))
    const end = serializeFormPeriodDate(new Date(2027, 11, 31))
    assert.equal(start, "2027-01-01T00:00:00.000Z", browserTZ)
    assert.equal(end, "2027-12-31T00:00:00.000Z", browserTZ)

    for (const serverTZ of timeZones) {
      process.env.TZ = serverTZ
      const values = buildPlaceholderValues({ fundingStart: start, fundingEnd: end })
      assert.equal(values.year, "2027", `${browserTZ} -> ${serverTZ}`)
      assert.equal(values.previous_year, "2026")
      assert.equal(values.period_months, "12")
      assert.equal(values.period_months_words, "twelve (12)")
      assert.equal(values.period_start, "1 January 2027")
      assert.equal(values.period_end, "31 December 2027")
      assert.equal(values.start_month, "January")
      assert.equal(values.end_month_short, "Dec")
      assert.deepEqual(buildPlaceholderValues({ fundingStart: new Date(start), fundingEnd: new Date(end) }), values)

      const pickerStart: Date = formPeriodDateForPicker(start)!
      const pickerEnd: Date = formPeriodDateForPicker(end)!
      assert.deepEqual([pickerStart.getFullYear(), pickerStart.getMonth(), pickerStart.getDate()], [2027, 0, 1])
      assert.deepEqual([pickerEnd.getFullYear(), pickerEnd.getMonth(), pickerEnd.getDate()], [2027, 11, 31])
      assert.equal(serializeFormPeriodDate(pickerStart), start)
      assert.equal(serializeFormPeriodDate(pickerEnd), end)

      const template = {
        title: "Results Achieved ({{year}})",
        fields: [{ name: "unchanged_key", label: "{{start_month_short}} to {{end_month_short}} {{year}}: {{period_months_words}} months" }],
      }
      const rendered = substituteTemplatePlaceholders(template, values)
      assert.equal(rendered.title, "Results Achieved (2027)")
      assert.equal(rendered.fields[0].label, "Jan to Dec 2027: twelve (12) months")
      assert.equal(rendered.fields[0].name, "unchanged_key")
      assert.equal(template.title, "Results Achieved ({{year}})", "Substitution must not mutate saved templates")
    }
  }

  for (const serverTZ of timeZones) {
    process.env.TZ = serverTZ
    for (const [start, end, months] of [
      ["2027-04-01", "2027-12-31", "9"],
      ["2028-01-01", "2028-12-31", "12"],
      ["2028-02-01", "2028-02-29", "1"],
      ["2027-01-01", "2028-01-31", "13"],
      ["2027-11-01", "2028-02-29", "4"],
    ]) {
      assert.equal(buildPlaceholderValues({ fundingStart: start, fundingEnd: end }).period_months, months)
    }
    assert.equal(buildPlaceholderValues({ fundingEnd: "2027-12-31" }).year, "2027")
    assert.equal(buildPlaceholderValues({ fundingStart: "invalid", fundingEnd: "2027-12-31" }).year, "2027")
    assert.equal(buildPlaceholderValues({ fundingStart: "2027-01-01" }).period_months, "several")
    assert.equal(buildPlaceholderValues().year, "the funding year")
    assert.equal(buildPlaceholderValues().previous_year, "the previous year")
    assert.equal(formPeriodDateForPicker("invalid"), undefined)
    assert.equal(formPeriodDateForPicker(null), undefined)
  }

  // Re-saving old local-midnight dates in the originating timezone repairs their
  // calendar day; the timestamp alone cannot identify that original timezone.
  process.env.TZ = "Asia/Kolkata"
  const legacyStart = "2026-12-31T18:30:00.000Z"
  const legacyEnd = "2027-12-30T18:30:00.000Z"
  const repairedStart = serializeFormPeriodDate(formPeriodDateForPicker(legacyStart)!)
  const repairedEnd = serializeFormPeriodDate(formPeriodDateForPicker(legacyEnd)!)
  process.env.TZ = "UTC"
  assert.equal(buildPlaceholderValues({ fundingStart: legacyStart, fundingEnd: legacyEnd }).period_months, "13")
  const repaired = buildPlaceholderValues({ fundingStart: repairedStart, fundingEnd: repairedEnd })
  assert.equal(repaired.year, "2027")
  assert.equal(repaired.period_months, "12")
  // Legacy timestamp normalisation used by scripts/normalize-period-dates.ts
  for (const [input, expected, rule] of [
    ["2027-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", "already-midnight"],
    ["2026-12-31T22:00:00.000Z", "2027-01-01T00:00:00.000Z", "local-midnight"], // SAST midnight
    ["2026-12-31T18:30:00.000Z", "2027-01-01T00:00:00.000Z", "local-midnight"], // IST midnight
    ["2027-12-30T18:30:00.000Z", "2027-12-31T00:00:00.000Z", "local-midnight"],
    ["2026-03-31T23:59:59.999Z", "2026-03-31T00:00:00.000Z", "end-of-day"],
    ["2026-03-31T21:59:59.999Z", "2026-03-31T00:00:00.000Z", "end-of-day"],   // SAST end of day
    ["2026-09-10T12:52:29.554Z", "2026-09-10T00:00:00.000Z", "assumed-sast"],
    ["2026-09-10T17:33:02.879Z", "2026-09-10T00:00:00.000Z", "assumed-sast"], // 19:33 SAST, still same day
    ["2026-09-10T22:30:00.000Z", "2026-09-11T00:00:00.000Z", "assumed-sast"], // 00:30 SAST next day
  ] as const) {
    const result = normalizeToUtcDay(new Date(input))
    assert.equal(result.date.toISOString(), expected, input)
    assert.equal(result.rule, rule, input)
  }

  console.log("form-period-dates: all assertions passed across five browser/server timezones")
} finally {
  if (originalTZ === undefined) delete process.env.TZ
  else process.env.TZ = originalTZ
}
