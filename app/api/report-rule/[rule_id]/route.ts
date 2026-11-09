import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { reportRuleInputError } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function loadRule(ruleId: string) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }
  }
  if (!permissions.isSuperUser(session.user)) {
    return { response: NextResponse.json({ error: "Permission denied - only superuser can manage report rules" }, { status: 403 }) }
  }
  const id = Number(ruleId)
  const rule = Number.isSafeInteger(id) ? await prisma.reportRule.findUnique({ where: { id } }) : null
  if (!rule) {
    return { response: NextResponse.json({ error: "Report rule not found" }, { status: 404 }) }
  }
  return { rule }
}

// Changes apply to reports created from now on; existing reports keep their dates
export async function PUT(req: NextRequest, { params }: { params: { rule_id: string } }) {
  const { rule, response } = await loadRule(params.rule_id)
  if (!rule) return response

  try {
    const data = await req.json()
    const error = await reportRuleInputError(data, rule)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const updated = await prisma.reportRule.update({
      where: { id: rule.id },
      data: {
        ...(data.triggerStatusId !== undefined && { triggerStatusId: data.triggerStatusId }),
        ...(data.active !== undefined && { active: data.active }),
        ...(rule.kind === "AFTER_STATUS" && data.dueDays !== undefined && { dueDays: data.dueDays }),
        ...(rule.kind === "PERIODIC" && {
          ...(data.periodMonths != null && { periodMonths: data.periodMonths }),
          ...(data.opensDaysBefore != null && { opensDaysBefore: data.opensDaysBefore }),
          ...(data.dueDaysAfterPeriodEnd != null && { dueDaysAfterPeriodEnd: data.dueDaysAfterPeriodEnd }),
        }),
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update report rule:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

// A rule that has created reports is switched off rather than deleted: its
// reports are how later runs know which periods are done
export async function DELETE(_req: NextRequest, { params }: { params: { rule_id: string } }) {
  const { rule, response } = await loadRule(params.rule_id)
  if (!rule) return response

  try {
    if (await prisma.localDevelopmentAgencyForm.count({ where: { reportRuleId: rule.id } })) {
      return NextResponse.json(
        { error: "This rule has already created reports. Switch it off instead of deleting it." },
        { status: 400 }
      )
    }
    await prisma.reportRule.delete({ where: { id: rule.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete report rule:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
