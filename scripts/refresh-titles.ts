/**
 * Give existing forms their automatic title: the template name and the period
 * the forms list shows (e.g. "Grant Funding Application – 2026",
 * "DFT Application – Q2"). New forms get it when they're created; this catches
 * up forms made before. Titles someone changed by hand are left alone.
 *
 *   yarn refresh-titles            # dry run: lists every title it would change
 *   yarn refresh-titles --commit   # apply
 */
import prisma from "../db"
import { automaticTitle } from "../lib/form-title"

const commit = process.argv.includes("--commit")

async function main() {
  const forms = await prisma.localDevelopmentAgencyForm.findMany({
    where: { customTitle: false },
    select: { id: true, title: true },
    orderBy: { id: "asc" },
  })

  const changes: Array<{ id: number; from: string; to: string }> = []
  for (const form of forms) {
    const title = await automaticTitle(form.id)
    if (title && title !== form.title) changes.push({ id: form.id, from: form.title, to: title })
  }
  console.log(`${forms.length} form(s) with automatic titles; ${changes.length} to update`)
  changes.forEach((c) => console.log(`  #${c.id} "${c.from}" → "${c.to}"`))

  if (!commit) {
    console.log("\nDry run. Re-run with --commit to apply.")
    return
  }
  for (const c of changes) {
    await prisma.localDevelopmentAgencyForm.update({ where: { id: c.id }, data: { title: c.to } })
  }
  console.log(`\nUpdated ${changes.length} title(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
