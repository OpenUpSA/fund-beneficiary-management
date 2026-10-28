/**
 * Group existing forms under their primary forms (primaryFormId).
 *
 * New forms are grouped automatically when they're created or their dates
 * change, and saving a template's primary settings regroups everything. Run
 * this after the primary-forms migration, or after editing form dates directly
 * in the database. The rules are in lib/primary-form.ts (planRegroup).
 *
 *   yarn link-primary-forms            # dry run, prints every move
 *   yarn link-primary-forms --commit   # apply in one transaction
 *
 * Also lists LDAs with overlapping primary forms of the same category. The app
 * blocks new overlaps, but older data may have them; a form in the overlap goes
 * under the primary that started most recently. Fix those dates by hand.
 */
import prisma from "../db"
import { applyRegroup, planRegroup } from "../lib/primary-form"

const commit = process.argv.includes("--commit")
const day = (date: Date) => date.toISOString().slice(0, 10)

async function reportOverlaps() {
  const primaries = await prisma.localDevelopmentAgencyForm.findMany({
    where: { formTemplate: { isPrimary: true }, formStatus: { label: { not: "Rejected" } } },
    select: {
      id: true,
      title: true,
      fundingStart: true,
      fundingEnd: true,
      localDevelopmentAgency: { select: { name: true } },
      formTemplate: { select: { formCategory: true } },
    },
    orderBy: [{ localDevelopmentAgencyId: "asc" }, { fundingStart: "asc" }],
  })
  const overlaps: string[] = []
  primaries.forEach((a, i) => {
    for (const b of primaries.slice(i + 1)) {
      if (a.localDevelopmentAgency.name !== b.localDevelopmentAgency.name) continue
      if (a.formTemplate.formCategory !== b.formTemplate.formCategory) continue
      if (a.fundingStart <= b.fundingEnd && b.fundingStart <= a.fundingEnd) {
        overlaps.push(
          `${a.localDevelopmentAgency.name}: #${a.id} "${a.title}" (${day(a.fundingStart)} – ${day(a.fundingEnd)}) ` +
          `overlaps #${b.id} "${b.title}" (${day(b.fundingStart)} – ${day(b.fundingEnd)})`
        )
      }
    }
  })
  if (overlaps.length > 0) {
    console.log(`\n${overlaps.length} overlapping primary form pair(s) — fix their dates:`)
    overlaps.forEach((line) => console.log(`  ${line}`))
  }
}

async function main() {
  const changes = await planRegroup()
  console.log(`${changes.length} form(s) to regroup`)
  for (const c of changes) {
    console.log(`#${c.id} "${c.title}": ${c.from ?? "ungrouped"} -> ${c.to ?? "ungrouped"}`)
  }

  await reportOverlaps()

  if (!commit) {
    console.log("\nDry run. Re-run with --commit to apply.")
    return
  }
  await applyRegroup(changes)
  console.log(`\nApplied ${changes.length} update(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
