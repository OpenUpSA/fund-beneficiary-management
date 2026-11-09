import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * A template's report settings: the report categories attached to its category
 * (with their base timing), this template's changes to each, and the report
 * templates a change may pin.
 */
export async function GET(_req: NextRequest, { params }: { params: { form_template_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const id = Number(params.form_template_id)
  const template = Number.isSafeInteger(id)
    ? await prisma.formTemplate.findUnique({
        where: { id },
        select: { id: true, name: true, category: { select: { id: true, label: true, role: true } } },
      })
    : null
  if (!template) {
    return NextResponse.json({ error: "Form template not found" }, { status: 404 })
  }

  const [rules, statuses] = await Promise.all([
    template.category
      ? prisma.reportRule.findMany({
          where: { parentCategoryId: template.category.id },
          orderBy: { id: "asc" },
          include: {
            reportCategory: {
              select: {
                id: true,
                label: true,
                reportKind: true,
                reportTriggerStatusId: true,
                reportDueDays: true,
                reportPeriodMonths: true,
                reportOpensDaysBefore: true,
                reportDueDaysAfterPeriodEnd: true,
                templates: { select: { id: true, name: true, active: true, createdAt: true }, orderBy: { name: "asc" } },
              },
            },
            overrides: { where: { formTemplateId: id } },
          },
        })
      : [],
    prisma.formStatus.findMany({ select: { id: true, label: true }, orderBy: { id: "asc" } }),
  ])

  return NextResponse.json({
    template,
    statuses,
    rules: rules.map(({ overrides, ...rule }) => ({ ...rule, override: overrides[0] ?? null })),
  })
}
