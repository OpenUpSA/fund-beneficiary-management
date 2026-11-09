import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { reportRuleInputError } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied - only superuser can manage report rules" }, { status: 403 })
  }

  try {
    const data = await req.json()
    const error = await reportRuleInputError(data)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const periodic = data.kind === "PERIODIC"
    const rule = await prisma.reportRule.create({
      data: {
        parentCategoryId: data.parentCategoryId,
        reportCategoryId: data.reportCategoryId,
        kind: data.kind,
        triggerStatusId: data.triggerStatusId ?? null,
        dueDays: periodic ? null : data.dueDays ?? null,
        periodMonths: periodic ? data.periodMonths : null,
        ...(periodic && data.opensDaysBefore != null && { opensDaysBefore: data.opensDaysBefore }),
        ...(periodic && data.dueDaysAfterPeriodEnd != null && { dueDaysAfterPeriodEnd: data.dueDaysAfterPeriodEnd }),
        active: data.active ?? true,
      },
    })
    return NextResponse.json(rule)
  } catch (error) {
    console.error("Failed to create report rule:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
