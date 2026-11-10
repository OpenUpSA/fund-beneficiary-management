import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { parsePlannedReportEdit } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Change a report that hasn't been created yet: skip it / plan it again
 * (`{ status: "SKIPPED" | "PLANNED" }`), or edit its period, opening and due
 * dates and label. Skipped and edited reports are never re-planned by settings
 * or date changes. Admin Tools users (super users) only.
 */
export async function PUT(req: NextRequest, { params }: { params: { lda_form_id: string; row_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const formId = Number(params.lda_form_id)
  const rowId = Number(params.row_id)
  const row = Number.isSafeInteger(formId) && Number.isSafeInteger(rowId)
    ? await prisma.plannedReport.findFirst({ where: { id: rowId, parentFormId: formId } })
    : null
  if (!row) {
    return NextResponse.json({ error: "Planned report not found" }, { status: 404 })
  }
  if (row.status === "CREATED") {
    return NextResponse.json({ error: "This report has already been created; edit the report form itself" }, { status: 400 })
  }

  try {
    const body = await req.json()
    // Skip or plan again
    if (body.status !== undefined) {
      if (body.status !== "SKIPPED" && body.status !== "PLANNED") {
        return NextResponse.json({ error: "Status must be SKIPPED or PLANNED" }, { status: 400 })
      }
      // Claimed by status, so a report being created right now isn't skipped by mistake
      const { count } = await prisma.plannedReport.updateMany({
        where: { id: row.id, status: { in: ["PLANNED", "SKIPPED"] } },
        data: { status: body.status },
      })
      if (count === 0) {
        return NextResponse.json({ error: "This report has just been created" }, { status: 409 })
      }
      return NextResponse.json({ ...row, status: body.status })
    }
    if (row.status !== "PLANNED") {
      return NextResponse.json({ error: "Plan this report again before changing it" }, { status: 400 })
    }
    const parsed = parsePlannedReportEdit(body, row)
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const updated = await prisma.plannedReport.update({
      where: { id: row.id },
      data: { ...parsed.edit, edited: true },
    })
    // The label shows in the forms list's Year / Quarter column once created
    revalidateTag("lda-forms:list")
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to edit planned report:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
