import { NextRequest, NextResponse } from "next/server"
import { authorisePlannedReports } from "@/lib/planned-report-access"
import { recalculateReports } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Re-plan this form's reports from the current settings. Reports that were
 * created, skipped, edited or added by hand stay as they are.
 */
export async function POST(_req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const { formId, response } = await authorisePlannedReports(params.lda_form_id)
  if (!formId) return response
  return NextResponse.json(await recalculateReports(formId))
}
