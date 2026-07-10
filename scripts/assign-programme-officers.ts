/**
 * Assign programme officers to LDAs from a CSV file in the project root.
 *
 * The CSV needs two columns: one naming the LDA, and one identifying the
 * programme officer by email, name, or user id. Column headers are passed in,
 * so any export works.
 *
 *   yarn assign-pos officers.csv --lda-column "LDA Name" --po-email "PO Email"
 *   yarn assign-pos officers.csv --lda-column "LDA Name" --po-name  "Officer"
 *   yarn assign-pos officers.csv --lda-column "LDA Name" --po-id    "User ID" --commit
 *
 * Exactly one of --po-email / --po-name / --po-id must be given; its value is
 * the CSV header to read the officer from.
 *
 * Every row is validated before anything is written:
 *   - the named LDA exists, and the name is unambiguous
 *   - the officer exists (by email, name, or id)
 *   - that user's role is PROGRAMME_OFFICER
 *   - no LDA appears twice in the file
 *
 * `name` is not unique in the schema, so --po-name can match several users. A
 * namesake who isn't a programme officer cannot be the intended target, so the
 * match is narrowed by role first and only reported ambiguous when two or more
 * PROGRAMME_OFFICERs share the name. Narrowing is logged, never silent.
 *
 * If any row fails, nothing is written. Dry run is the default; --commit applies
 * the changes in a single transaction.
 *
 * ⚠️  LocalDevelopmentAgency.programmeOfficer is the only User<->LDA relation in
 * the schema, and lib/auth.ts derives each session's `ldaIds` from it. Reassigning
 * an LDA therefore REVOKES the previous officer's access to it. The dry run lists
 * every user who would lose access.
 */
import { PrismaClient, Role } from '@prisma/client'
import { parseCsv, isValidEmail } from '../lib/csv'
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function flag(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i !== -1 ? process.argv[i + 1] ?? null : null
}

type PoMode = 'email' | 'name' | 'id'

const COMMIT = process.argv.includes('--commit')
const CSV_ARG = process.argv[2]
const LDA_COLUMN = flag('--lda-column')

const PO_FLAGS: [PoMode, string, string | null][] = [
  ['email', '--po-email', flag('--po-email')],
  ['name', '--po-name', flag('--po-name')],
  ['id', '--po-id', flag('--po-id')],
]

const USAGE = `
Usage:
  yarn assign-pos <file.csv> --lda-column "<header>" (--po-email|--po-name|--po-id) "<header>" [--commit]

  <file.csv>       CSV file in the project root
  --lda-column     header of the column holding the LDA name

  Identify the programme officer by exactly one of:
  --po-email       header of the column holding the officer's email address
  --po-name        header of the column holding the officer's full name
  --po-id          header of the column holding the officer's numeric user id

  --commit         apply the changes (default is a dry run)
`.trim()

interface Row {
  line: number
  ldaName: string
  /** Raw officer cell, interpreted according to the chosen mode. */
  poValue: string
}

interface Officer {
  id: number
  name: string
  email: string
  role: Role
}

interface Resolved extends Row {
  ldaId: number
  po: Officer
  /** Officer currently on this LDA, if any — they lose access when we reassign. */
  currentOfficer: Officer | null
}

interface Invalid extends Row {
  reason: string
}

function describeTarget(): string {
  const raw = process.env.POSTGRES_URL_NON_POOLING
  if (!raw) return 'POSTGRES_URL_NON_POOLING is not set'
  try {
    const u = new URL(raw)
    return `${u.host}${u.pathname}`
  } catch {
    return '(unparsable connection string)'
  }
}

function confirm(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(prompt, (a) => { rl.close(); resolve(a) }))
}

function heading(text: string) {
  console.log(`\n${text}`)
  console.log('─'.repeat(Math.max(text.length, 60)))
}

const describeOfficer = (o: Officer) => `${o.name} <${o.email}>`

/**
 * Look up every officer referenced by the CSV in one query, and return a
 * resolver that maps a raw cell to a user, an "ambiguous" marker, or nothing.
 */
async function buildOfficerResolver(mode: PoMode, values: string[]) {
  const wanted = [...new Set(values.filter(Boolean))]

  if (mode === 'id') {
    const ids = wanted.filter((v) => /^\d+$/.test(v)).map(Number)
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true, role: true },
    })
    const byId = new Map(users.map((u) => [String(u.id), u]))
    return (raw: string) => ({ matches: byId.has(raw) ? [byId.get(raw)!] : [] })
  }

  if (mode === 'email') {
    const users = await prisma.user.findMany({
      where: { email: { in: wanted, mode: 'insensitive' } },
      select: { id: true, name: true, email: true, role: true },
    })
    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]))
    return (raw: string) => ({ matches: byEmail.has(raw.toLowerCase()) ? [byEmail.get(raw.toLowerCase())!] : [] })
  }

  // Names are not unique in the schema, so a name can resolve to several users.
  const users = await prisma.user.findMany({
    where: { name: { in: wanted, mode: 'insensitive' } },
    select: { id: true, name: true, email: true, role: true },
  })
  const byName = new Map<string, Officer[]>()
  for (const u of users) {
    const key = u.name.trim().toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), u])
  }
  return (raw: string) => ({ matches: byName.get(raw.trim().toLowerCase()) ?? [] })
}

async function main() {
  const chosen = PO_FLAGS.filter(([, , value]) => value !== null)

  if (!CSV_ARG || !LDA_COLUMN || chosen.length === 0) {
    console.error(USAGE)
    process.exit(1)
  }
  if (chosen.length > 1) {
    console.error(`Pass exactly one of --po-email, --po-name, --po-id. Got: ${chosen.map(([, f]) => f).join(', ')}`)
    process.exit(1)
  }

  const [PO_MODE, PO_FLAG, PO_COLUMN] = chosen[0] as [PoMode, string, string]

  // Keep the file inside the project root — no traversing out of it.
  const root = process.cwd()
  const csvPath = path.resolve(root, CSV_ARG)
  if (path.dirname(csvPath) !== root) {
    console.error(`The CSV must sit in the project root. Got: ${CSV_ARG}`)
    process.exit(1)
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`)
    process.exit(1)
  }

  const records = parseCsv(fs.readFileSync(csvPath, 'utf8'))
  if (records.length === 0) {
    console.error('CSV has no data rows.')
    process.exit(1)
  }

  const headers = Object.keys(records[0])
  for (const [label, col] of [['--lda-column', LDA_COLUMN], [PO_FLAG, PO_COLUMN]] as const) {
    if (!headers.includes(col)) {
      console.error(`${label} "${col}" is not a header in ${CSV_ARG}.`)
      console.error(`Available headers: ${headers.map((h) => `"${h}"`).join(', ')}`)
      process.exit(1)
    }
  }

  console.log(`Database: ${describeTarget()}`)
  console.log(`CSV:      ${CSV_ARG} (${records.length} data row${records.length === 1 ? '' : 's'})`)
  console.log(`Columns:  LDA = "${LDA_COLUMN}", officer = "${PO_COLUMN}" (matched by ${PO_MODE})`)

  // +2: one for the header row, one because humans count from 1.
  const rows: Row[] = records.map((r, i) => ({
    line: i + 2,
    ldaName: r[LDA_COLUMN] ?? '',
    poValue: (r[PO_COLUMN] ?? '').trim(),
  }))

  // Resolve every LDA name and officer in two queries rather than per row.
  const ldas = await prisma.localDevelopmentAgency.findMany({
    select: {
      id: true,
      name: true,
      programmeOfficer: { select: { id: true, name: true, email: true, role: true } },
    },
  })
  const ldasByName = new Map<string, typeof ldas>()
  for (const lda of ldas) {
    const key = lda.name.trim().toLowerCase()
    ldasByName.set(key, [...(ldasByName.get(key) ?? []), lda])
  }

  const resolveOfficer = await buildOfficerResolver(PO_MODE, rows.map((r) => r.poValue))

  const valid: Resolved[] = []
  const invalid: Invalid[] = []
  const warnings: string[] = []
  const seenLdaIds = new Map<number, number>() // ldaId -> first line that claimed it

  for (const row of rows) {
    if (!row.ldaName) { invalid.push({ ...row, reason: `empty "${LDA_COLUMN}"` }); continue }
    if (!row.poValue) { invalid.push({ ...row, reason: `empty "${PO_COLUMN}"` }); continue }

    // Shape check before we bother looking anything up.
    if (PO_MODE === 'email' && !isValidEmail(row.poValue)) {
      invalid.push({ ...row, reason: `"${row.poValue}" is not a valid email` }); continue
    }
    if (PO_MODE === 'id' && !/^\d+$/.test(row.poValue)) {
      invalid.push({ ...row, reason: `"${row.poValue}" is not a numeric user id` }); continue
    }

    const ldaMatches = ldasByName.get(row.ldaName.trim().toLowerCase()) ?? []
    if (ldaMatches.length === 0) { invalid.push({ ...row, reason: `no LDA named "${row.ldaName}"` }); continue }
    if (ldaMatches.length > 1) {
      invalid.push({ ...row, reason: `"${row.ldaName}" matches ${ldaMatches.length} LDAs (ids ${ldaMatches.map((m) => m.id).join(', ')})` })
      continue
    }
    const lda = ldaMatches[0]

    const { matches } = resolveOfficer(row.poValue)
    if (matches.length === 0) { invalid.push({ ...row, reason: `no user with ${PO_MODE} ${row.poValue}` }); continue }

    // Only `name` can match several users — email is @unique, id is the PK.
    // A namesake who isn't a programme officer can't be the intended target, so
    // narrow by role before calling it ambiguous.
    const officers = matches.filter((m) => m.role === Role.PROGRAMME_OFFICER)

    if (officers.length === 0) {
      const roles = matches.map((m) => `${describeOfficer(m)} is ${m.role}`).join('; ')
      invalid.push({ ...row, reason: `no PROGRAMME_OFFICER with ${PO_MODE} ${row.poValue} — ${roles}` })
      continue
    }
    if (officers.length > 1) {
      const ids = officers.map((m) => m.id).join(', ')
      const emails = officers.map((m) => m.email).join(', ')
      invalid.push({
        ...row,
        reason: `${PO_MODE} "${row.poValue}" matches ${officers.length} programme officers (ids ${ids}: ${emails}) — disambiguate with --po-id or --po-email`,
      })
      continue
    }
    const po = officers[0]

    // A non-PO namesake was skipped over; say so rather than silently resolving.
    if (matches.length > officers.length) {
      const others = matches.filter((m) => m.role !== Role.PROGRAMME_OFFICER)
      warnings.push(
        `line ${row.line}: "${row.poValue}" also matches ${others.length} non-officer user(s) ` +
          `(${others.map((m) => `#${m.id} ${m.role}`).join(', ')}); using #${po.id} ${po.email}`
      )
    }

    const firstClaim = seenLdaIds.get(lda.id)
    if (firstClaim !== undefined) {
      invalid.push({ ...row, reason: `LDA "${lda.name}" already assigned on line ${firstClaim}` })
      continue
    }
    seenLdaIds.set(lda.id, row.line)

    valid.push({ ...row, ldaId: lda.id, po, currentOfficer: lda.programmeOfficer })
  }

  if (invalid.length > 0) {
    heading(`INVALID ROWS (${invalid.length})`)
    for (const r of invalid) console.log(`  line ${String(r.line).padEnd(4)} ${r.reason}`)
  }

  if (warnings.length > 0) {
    heading(`AMBIGUOUS NAMES RESOLVED BY ROLE (${warnings.length})`)
    for (const w of warnings) console.log(`  ${w}`)
  }

  const changes = valid.filter((r) => r.currentOfficer?.id !== r.po.id)
  const noops = valid.filter((r) => r.currentOfficer?.id === r.po.id)

  if (noops.length > 0) {
    heading(`ALREADY CORRECT (${noops.length}) — will be skipped`)
    for (const r of noops) console.log(`  #${String(r.ldaId).padEnd(4)} ${r.ldaName} -> ${r.po.name}`)
  }

  heading(`WILL ASSIGN (${changes.length})`)
  if (changes.length === 0) {
    console.log('  nothing to do')
  } else {
    for (const r of changes) {
      const from = r.currentOfficer ? `${r.currentOfficer.name} (${r.currentOfficer.role})` : 'unassigned'
      console.log(`  #${String(r.ldaId).padEnd(4)} ${r.ldaName.slice(0, 34).padEnd(35)} ${from}  ->  ${describeOfficer(r.po)}`)
    }
  }

  // Anyone being displaced loses this LDA from their session's ldaIds.
  const displaced = changes.filter((r) => r.currentOfficer)
  if (displaced.length > 0) {
    heading(`ACCESS REVOKED (${displaced.length})`)
    console.log(`lib/auth.ts derives ldaIds from this column, so the previous officer loses`)
    console.log(`access to the LDA at their next login.\n`)
    for (const r of displaced) {
      const c = r.currentOfficer!
      const note = c.role === Role.USER ? '  <- role USER: this is their only LDA access' : ''
      console.log(`  ${describeOfficer(c)} loses LDA #${r.ldaId}${note}`)
    }
  }

  if (invalid.length > 0) {
    console.log(`\n${invalid.length} invalid row(s). Nothing was written — fix the CSV and re-run.`)
    process.exit(1)
  }

  if (changes.length === 0) return

  if (!COMMIT) {
    console.log(`\nDry run — nothing was written. Re-run with --commit to apply.`)
    return
  }

  console.log(`\nAbout to reassign ${changes.length} LDA(s) on ${describeTarget()}.`)
  const answer = await confirm(`Type the number of changes (${changes.length}) to proceed, anything else to abort: `)
  if (answer.trim() !== String(changes.length)) {
    console.log('Aborted. No changes made.')
    return
  }

  await prisma.$transaction(
    changes.map((r) =>
      prisma.localDevelopmentAgency.update({
        where: { id: r.ldaId },
        data: { programmeOfficerId: r.po.id },
      })
    )
  )

  console.log(`\nAssigned ${changes.length} LDA(s).`)
  if (displaced.length > 0) {
    console.log(`${displaced.length} displaced user(s) keep their old ldaIds until their JWT expires or they sign out and in.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
