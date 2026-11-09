import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { authorisePlannedReports } from "@/lib/planned-report-access"
import { parsePlannedReportEdit } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Params = { params: { lda_form_id: string } }

/** This form's planned reports, with the report each created one became. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { formId, response } = await authorisePlannedReports(params.lda_form_id)
  if (!formId) return response

  const [rows, reportCategories] = await Promise.all([
    prisma.plannedReport.findMany({
      where: { parentFormId: formId },
      orderBy: [{ periodStart: "asc" }, { period: "asc" }, { id: "asc" }],
      include: {
        reportCategory: { select: { id: true, label: true } },
        reportTemplate: { select: { id: true, name: true } },
        triggerStatus: { select: { id: true, label: true } },
        reportForm: { select: { id: true, title: true, localDevelopmentAgencyId: true, formStatus: { select: { label: true } } } },
      },
    }),
    // For adding a one-off report
    prisma.formCategory.findMany({
      where: { role: "REPORT", active: true },
      orderBy: { label: "asc" },
      select: { id: true, label: true, templates: { where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } } },
    }),
  ])
  return NextResponse.json({ rows, reportCategories })
}

/** Add a one-off report to this form only. */
export async function POST(req: NextRequest, { params }: Params) {
  const { formId, response } = await authorisePlannedReports(params.lda_form_id)
  if (!formId) return response

  try {
    const data = await req.json()
    const category = Number.isInteger(data.reportCategoryId)
      ? await prisma.formCategory.findUnique({ where: { id: data.reportCategoryId }, select: { role: true, label: true } })
      : null
    if (category?.role !== "REPORT") {
      return NextResponse.json({ error: "Choose a report category" }, { status: 400 })
    }
    if (data.reportTemplateId != null) {
      const template = Number.isInteger(data.reportTemplateId)
        ? await prisma.formTemplate.findUnique({ where: { id: data.reportTemplateId }, select: { formCategoryId: true } })
        : null
      if (template?.formCategoryId !== data.reportCategoryId) {
        return NextResponse.json({ error: "The template must be in the report category" }, { status: 400 })
      }
    }
    if (!data.periodStart || !data.periodEnd) {
      return NextResponse.json({ error: "A report needs a start and end date" }, { status: 400 })
    }
    const parsed = parsePlannedReportEdit(data, { periodStart: new Date(data.periodStart), periodEnd: new Date(data.periodEnd) })
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const row = await prisma.plannedReport.create({
      data: {
        parentFormId: formId,
        reportCategoryId: data.reportCategoryId,
        reportTemplateId: data.reportTemplateId ?? null,
        label: parsed.edit.label ?? "",
        periodStart: parsed.edit.periodStart!,
        periodEnd: parsed.edit.periodEnd!,
        opensOn: parsed.edit.opensOn ?? null,
        dueOn: parsed.edit.dueOn ?? null,
        edited: true,
      },
    })
    return NextResponse.json(row)
  } catch (error) {
    console.error("Failed to add planned report:", error)
    return NextResponse.json({ error: "Failed to add" }, { status: 500 })
  }
}
