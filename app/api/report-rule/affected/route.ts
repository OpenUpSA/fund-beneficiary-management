import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { formsGettingReport, runningForms, utcDay } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * How much a change would touch, so the screen can ask before saving:
 *   ?reportCategoryId=  running forms getting that report (changing its timing)
 *   ?parentCategoryId=  running forms in that category (attaching a report)
 *   ?templateId=        running forms of that template (its report changes, moving it)
 *   ?ruleId=            planned reports that detaching would remove
 *   ?formId=            this form's planned reports that new dates would re-plan
 * Returns { forms } or { reports }.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const id = (name: string) => {
    const value = params.get(name)
    return value !== null && Number.isSafeInteger(Number(value)) ? Number(value) : null
  }
  const today = new Date()

  // A form's own date change: whoever can see the form (approvers change dates)
  const formId = id("formId")
  if (formId !== null) {
    const form = await prisma.localDevelopmentAgencyForm.findUnique({ where: { id: formId }, select: { localDevelopmentAgencyId: true } })
    if (!form || !permissions.canViewLDA(user, form.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }
    const reports = await prisma.plannedReport.count({
      where: { parentFormId: formId, reportRuleId: { not: null }, status: "PLANNED", edited: false },
    })
    return NextResponse.json({ reports })
  }

  // Report settings: super users only, like the settings themselves
  if (!permissions.isSuperUser(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }
  const ruleId = id("ruleId")
  if (ruleId !== null) {
    const reports = await prisma.plannedReport.count({
      where: { reportRuleId: ruleId, status: "PLANNED", periodEnd: { gte: utcDay(today) } }, // what will stop being created
    })
    return NextResponse.json({ reports })
  }
  const reportCategoryId = id("reportCategoryId")
  const parentCategoryId = id("parentCategoryId")
  const templateId = id("templateId")
  const where = reportCategoryId !== null ? formsGettingReport(reportCategoryId)
    : parentCategoryId !== null ? { formTemplate: { formCategoryId: parentCategoryId } }
    : templateId !== null ? { formTemplateId: templateId }
    : null
  if (!where) {
    return NextResponse.json({ error: "Say what is changing" }, { status: 400 })
  }
  const forms = await prisma.localDevelopmentAgencyForm.count({ where: runningForms(where, today) })
  return NextResponse.json({ forms })
}
