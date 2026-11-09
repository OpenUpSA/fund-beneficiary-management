/**
 * Plan the reports of existing forms from the current report settings.
 *
 * New forms are planned when they're created; this covers forms that existed
 * before planned reports, or after reports were attached to their category.
 * It works like "Recalculate from settings" on each form: reports already
 * created, skipped or edited by hand stay, and nothing is planned over them.
 *
 *   yarn plan-reports            # dry run: how many reports each form would get
 *   yarn plan-reports --commit   # apply
 */
import prisma from "../db"
import { recalculateReports } from "../lib/report-rules"

const commit = process.argv.includes("--commit")

async function main() {
  // Only forms whose category has reports attached can get any
  const forms = await prisma.localDevelopmentAgencyForm.findMany({
    where: { formTemplate: { category: { reportRules: { some: {} } } } },
    select: {
      id: true,
      title: true,
      localDevelopmentAgency: { select: { name: true } },
      _count: { select: { plannedReports: true } },
    },
    orderBy: { id: "asc" },
  })
  console.log(`${forms.length} form(s) in categories with reports attached`)

  if (!commit) {
    forms.forEach((f) => console.log(`  #${f.id} ${f.localDevelopmentAgency.name} · "${f.title}" (${f._count.plannedReports} planned now)`))
    console.log("\nDry run. Re-run with --commit to plan their reports.")
    return
  }

  let added = 0
  for (const form of forms) {
    const result = await recalculateReports(form.id)
    added += result.added
    console.log(`  #${form.id} "${form.title}": ${result.added} planned, ${result.removed} replaced`)
  }
  console.log(`\nPlanned ${added} report(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
