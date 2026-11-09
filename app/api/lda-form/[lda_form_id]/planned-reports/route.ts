import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { authorisePlannedReports } from "@/lib/planned-report-access"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** This form's planned reports, with the report each created one became. */
export async function GET(_req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const { formId, response } = await authorisePlannedReports(params.lda_form_id)
  if (!formId) return response

  const rows = await prisma.plannedReport.findMany({
    where: { parentFormId: formId },
    orderBy: [{ periodStart: "asc" }, { period: "asc" }, { id: "asc" }],
    include: {
      reportCategory: { select: { id: true, label: true } },
      triggerStatus: { select: { id: true, label: true } },
      reportForm: { select: { id: true, title: true, localDevelopmentAgencyId: true, formStatus: { select: { label: true } } } },
    },
  })
  return NextResponse.json({ rows })
}
