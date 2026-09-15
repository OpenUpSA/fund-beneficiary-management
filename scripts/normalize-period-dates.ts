/**
 * One-off: normalise reporting-period dates to UTC calendar days.
 *
 * Funding and schedule dates used to be saved as the browser's local midnight
 * (22:00Z from South Africa, 18:30Z from India), as end-of-day markers
 * (hh:59:59.999Z) from the schedule generator, or with whatever wall-clock time
 * the date picker happened to keep. Since serializeFormPeriodDate every new
 * value is stored at UTC midnight, and the placeholder/date code reads the UTC
 * day. Old rows therefore render one day early (wrong year, 13-month periods).
 *
 * This maps each legacy value to the UTC midnight of its intended day using
 * normalizeToUtcDay (lib/form-period-dates.ts) and reports which rule applied.
 * Rows that fall under "assumed-sast" had an arbitrary time of day; the South
 * African calendar day is assumed, so review that list before committing.
 *
 *   yarn normalize-period-dates            # dry run, prints every change
 *   yarn normalize-period-dates --commit   # apply in one transaction
 *
 * Columns: LocalDevelopmentAgencyForm.fundingStart/fundingEnd and
 * ReportPeriodSchedule.periodStart/periodEnd/availableDate/dueDate.
 * Form dueDate is left alone: it is shown with a time and has its own semantics.
 */
import prisma from "../db"
import { normalizeToUtcDay, NormalizeRule } from "../lib/form-period-dates"

const commit = process.argv.includes("--commit")

type Change = { table: string; id: number; column: string; from: Date; to: Date; rule: NormalizeRule }

function plan(table: string, rows: Array<Record<string, unknown>>, columns: string[]): Change[] {
  const changes: Change[] = []
  for (const row of rows) {
    for (const column of columns) {
      const value = row[column]
      if (!(value instanceof Date)) continue
      const { date, rule } = normalizeToUtcDay(value)
      if (rule === "already-midnight") continue
      changes.push({ table, id: row.id as number, column, from: value, to: date, rule })
    }
  }
  return changes
}

async function main() {
  const forms = await prisma.localDevelopmentAgencyForm.findMany({
    select: { id: true, fundingStart: true, fundingEnd: true },
    orderBy: { id: "asc" },
  })
  const schedules = await prisma.reportPeriodSchedule.findMany({
    select: { id: true, periodStart: true, periodEnd: true, availableDate: true, dueDate: true },
    orderBy: { id: "asc" },
  })

  const changes = [
    ...plan("LocalDevelopmentAgencyForm", forms, ["fundingStart", "fundingEnd"]),
    ...plan("ReportPeriodSchedule", schedules, ["periodStart", "periodEnd", "availableDate", "dueDate"]),
  ]

  const byRule: Record<string, number> = {}
  for (const c of changes) byRule[c.rule] = (byRule[c.rule] ?? 0) + 1
  console.log(`Scanned ${forms.length} forms and ${schedules.length} schedules; ${changes.length} values to normalise`)
  console.table(byRule)

  for (const c of changes) {
    const flag = c.rule === "assumed-sast" ? "  <-- review" : ""
    console.log(`${c.table}#${c.id}.${c.column}: ${c.from.toISOString()} -> ${c.to.toISOString()} [${c.rule}]${flag}`)
  }

  if (!commit) {
    console.log("\nDry run. Re-run with --commit to apply.")
    return
  }

  // Group per row so each row is one update
  const grouped = new Map<string, { table: string; id: number; data: Record<string, Date> }>()
  for (const c of changes) {
    const key = `${c.table}#${c.id}`
    const entry = grouped.get(key) ?? { table: c.table, id: c.id, data: {} }
    entry.data[c.column] = c.to
    grouped.set(key, entry)
  }

  await prisma.$transaction(
    [...grouped.values()].map((row) =>
      row.table === "LocalDevelopmentAgencyForm"
        ? prisma.localDevelopmentAgencyForm.update({ where: { id: row.id }, data: row.data })
        : prisma.reportPeriodSchedule.update({ where: { id: row.id }, data: row.data })
    )
  )
  console.log(`\nApplied ${grouped.size} row updates.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
