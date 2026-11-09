import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { authorisePlannedReports, findPlannedReport } from "@/lib/planned-report-access"
import { parsePlannedReportEdit } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Params = { params: { lda_form_id: string; row_id: string } }

/**
 * Change a planned report's dates (it then keeps them when the form is
 * recalculated), or skip / unskip it with `status`.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { formId, response } = await authorisePlannedReports(params.lda_form_id)
  if (!formId) return response
  const { row, response: notFound } = await findPlannedReport(formId, params.row_id)
  if (!row) return notFound
  if (row.status === "CREATED") {
    return NextResponse.json({ error: "This report has been created; edit the report itself" }, { status: 400 })
  }

  try {
    const data = await req.json()
    if (data.status !== undefined && data.status !== "SKIPPED" && data.status !== "PLANNED") {
      return NextResponse.json({ error: "Status must be skipped or planned" }, { status: 400 })
    }
    const parsed = parsePlannedReportEdit(data, row)
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const datesChanged = Object.keys(parsed.edit).length > 0

    const updated = await prisma.plannedReport.update({
      where: { id: row.id },
      data: {
        ...parsed.edit,
        ...(data.status !== undefined && { status: data.status }),
        ...(datesChanged && { edited: true }),
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update planned report:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
