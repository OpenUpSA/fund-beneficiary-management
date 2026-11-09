import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function loadLink(ruleId: string) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }
  }
  if (!permissions.isSuperUser(session.user)) {
    return { response: NextResponse.json({ error: "Permission denied - only superuser can manage reports" }, { status: 403 }) }
  }
  const id = Number(ruleId)
  const link = Number.isSafeInteger(id) ? await prisma.reportRule.findUnique({ where: { id } }) : null
  if (!link) {
    return { response: NextResponse.json({ error: "Report not found" }, { status: 404 }) }
  }
  return { link }
}

// New forms stop getting the report; forms that already have it planned keep it
export async function DELETE(_req: NextRequest, { params }: { params: { rule_id: string } }) {
  const { link, response } = await loadLink(params.rule_id)
  if (!link) return response

  try {
    await prisma.reportRule.delete({ where: { id: link.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to detach report:", error)
    return NextResponse.json({ error: "Failed to detach" }, { status: 500 })
  }
}
