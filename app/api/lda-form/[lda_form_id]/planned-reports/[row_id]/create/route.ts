import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { authorisePlannedReports, findPlannedReport } from "@/lib/planned-report-access"
import { createReport } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Create a planned report now, without waiting for its opening date or the trigger. */
export async function POST(_req: NextRequest, { params }: { params: { lda_form_id: string; row_id: string } }) {
  const { formId, response } = await authorisePlannedReports(params.lda_form_id)
  if (!formId) return response
  const { row, response: notFound } = await findPlannedReport(formId, params.row_id)
  if (!row) return notFound

  const result = await createReport(row.id, new Date())
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  revalidateTag("lda-forms:list")
  return NextResponse.json(result.report)
}
