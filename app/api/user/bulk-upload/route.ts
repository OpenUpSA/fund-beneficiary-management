import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import prisma from "@/db"
import { createHash } from "@/lib/hash"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions, getAvailableRolesForCreation, normalizeRole } from "@/lib/permissions"
import { createPasswordResetToken } from "@/lib/token"
import { sendSetPasswordEmail } from "@/lib/email"
import { isValidEmail } from "@/lib/csv"
import { randomBytes } from "crypto"
import { Role } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RowStatus = "ready" | "error" | "created" | "failed" | "skipped"

// Normalised row sent by the client (role + sendEmail already resolved/edited).
interface InputRow {
  firstName?: string
  lastName?: string
  email?: string
  additionalEmails?: string[]
  organisation?: string
  role?: string
  sendEmail?: boolean
}

interface RowResult {
  index: number
  firstName: string
  lastName: string
  email: string
  additionalEmails: string[]
  organisation: string
  ldaName: string | null
  role: Role
  sendEmail: boolean
  status: RowStatus
  messages: string[]
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS)
    const currentUser = session?.user || null

    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (!permissions.isSuperUser(currentUser) && !permissions.isAdmin(currentUser)) {
      return NextResponse.json(
        { error: "Permission denied - only superuser and admin can bulk upload users" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const inputRows: InputRow[] = Array.isArray(body.rows) ? body.rows : []
    const approved: boolean = body.approved !== false // default true
    const dryRun: boolean = body.dryRun !== false // default to dry run for safety

    // Roles the current user is permitted to create.
    const allowedRoles = getAvailableRolesForCreation(currentUser)

    if (inputRows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    if (inputRows.length > 1000) {
      return NextResponse.json({ error: "Too many rows (max 1000 per upload)" }, { status: 400 })
    }

    // Resolve + validate the role per row. The client sends a (possibly edited)
    // role; we still normalise and permission-check it server-side.
    const roleErrors: (string | null)[] = []

    const rows: RowResult[] = inputRows.map((raw, i) => {
      const firstName = (raw.firstName ?? "").trim()
      const lastName = (raw.lastName ?? "").trim()
      const email = (raw.email ?? "").trim()
      const additionalEmails = Array.isArray(raw.additionalEmails) ? raw.additionalEmails : []
      const organisation = (raw.organisation ?? "").trim()
      const sendEmail = raw.sendEmail === true

      const resolved = normalizeRole(String(raw.role ?? ""))
      let role: Role = Role.USER
      let roleError: string | null = null
      if (!resolved) {
        roleError = `Invalid role: ${raw.role ?? "(none)"}`
      } else if (!allowedRoles.includes(resolved)) {
        roleError = `Not permitted to create role: ${raw.role}`
      } else {
        role = resolved
      }
      roleErrors.push(roleError)

      return {
        index: i + 1,
        firstName,
        lastName,
        email,
        additionalEmails,
        organisation,
        ldaName: null,
        role,
        sendEmail,
        status: "ready",
        messages: [],
      }
    })

    // --- Validation pass ---------------------------------------------------

    // Detect duplicate emails within the uploaded file.
    const emailCounts = rows.reduce<Record<string, number>>((acc, r) => {
      if (r.email) {
        const key = r.email.toLowerCase()
        acc[key] = (acc[key] ?? 0) + 1
      }
      return acc
    }, {})

    // Batch-load existing users and LDAs referenced in the file.
    const candidateEmails = rows.map((r) => r.email.toLowerCase()).filter(Boolean)
    const candidateOrgs = Array.from(new Set(rows.map((r) => r.organisation).filter(Boolean)))

    const [existingUsers, existingLdas] = await Promise.all([
      candidateEmails.length
        ? prisma.user.findMany({
            where: { email: { in: candidateEmails, mode: "insensitive" } },
            select: { email: true },
          })
        : Promise.resolve([]),
      candidateOrgs.length
        ? prisma.localDevelopmentAgency.findMany({
            where: { name: { in: candidateOrgs, mode: "insensitive" } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ])

    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()))
    const ldaByName = new Map(existingLdas.map((l) => [l.name.toLowerCase(), l]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const messages: string[] = []

      if (!row.firstName && !row.lastName) {
        messages.push("Missing name")
      }
      if (!row.email) {
        messages.push("Missing email")
      } else if (!isValidEmail(row.email)) {
        messages.push(`Invalid email: ${row.email}`)
      } else if (emailCounts[row.email.toLowerCase()] > 1) {
        messages.push("Duplicate email in file")
      } else if (existingEmailSet.has(row.email.toLowerCase())) {
        messages.push("User already exists")
      }

      // Role validation (from the CSV "Role" column).
      if (roleErrors[i]) {
        messages.push(roleErrors[i] as string)
      }

      // Organisation is only required (and linked) for LDA Users.
      if (row.role === Role.USER) {
        if (!row.organisation) {
          messages.push("Missing organisation")
        } else {
          const lda = ldaByName.get(row.organisation.toLowerCase())
          if (lda) {
            row.ldaName = lda.name
          } else {
            messages.push("Organisation not found")
          }
        }
      }

      if (messages.length > 0) {
        row.status = "error"
        row.messages = messages
      } else if (row.additionalEmails.length > 0) {
        row.messages = [`Additional emails noted: ${row.additionalEmails.join(", ")}`]
      }
    }

    const summary = {
      total: rows.length,
      ready: rows.filter((r) => r.status === "ready").length,
      errors: rows.filter((r) => r.status === "error").length,
      created: 0,
      failed: 0,
      emailsSent: 0,
    }

    // Dry run → return validation results only.
    if (dryRun) {
      return NextResponse.json({ dryRun: true, summary, rows })
    }

    // --- Creation pass -----------------------------------------------------

    for (const row of rows) {
      if (row.status === "error") {
        row.status = "skipped"
        continue
      }

      // LDA linking only applies to LDA Users.
      const lda = row.role === Role.USER ? ldaByName.get(row.organisation.toLowerCase()) : undefined
      if (row.role === Role.USER && !lda) {
        row.status = "skipped"
        row.messages = ["Organisation not found"]
        continue
      }

      try {
        const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim()
        // Always store an unguessable password; the user sets a real one via
        // the set-password email or the forgot-password flow.
        const tempPassword = "temp_" + randomBytes(12).toString("hex")
        const passwordHash = await createHash(tempPassword)

        const record = await prisma.user.create({
          data: {
            name,
            email: row.email,
            role: row.role,
            approved,
            passwordHash,
            ...(lda ? { localDevelopmentAgencies: { connect: [{ id: lda.id }] } } : {}),
          },
          select: { id: true, email: true, name: true },
        })

        if (row.sendEmail) {
          try {
            const token = await createPasswordResetToken(record.id, "SET_PASSWORD")
            await sendSetPasswordEmail(record.email, token, record.name)
            summary.emailsSent++
            row.messages = [...row.messages, "Set-password email sent"]
          } catch (emailError) {
            console.error("Bulk upload: failed to send email to", record.email, emailError)
            row.messages = [...row.messages, "Created, but email failed to send"]
          }
        }

        row.status = "created"
        summary.created++
      } catch (error) {
        console.error("Bulk upload: failed to create user", row.email, error)
        row.status = "failed"
        row.messages = ["Failed to create: " + (error as Error).message]
        summary.failed++
      }
    }

    if (summary.created > 0) {
      revalidateTag("users:list")
    }

    return NextResponse.json({ dryRun: false, summary, rows })
  } catch (error) {
    console.error("Bulk upload failed:", error)
    return NextResponse.json(
      { error: "Bulk upload failed", detail: (error as Error).message },
      { status: 500 }
    )
  }
}
