import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { reportLinkInputError } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Attach a report category to a primary or secondary category. Its timing comes from the report category. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied - only superuser can manage reports" }, { status: 403 })
  }

  try {
    const data = await req.json()
    const error = await reportLinkInputError(data)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }
    const existing = await prisma.reportRule.findUnique({
      where: { parentCategoryId_reportCategoryId: { parentCategoryId: data.parentCategoryId, reportCategoryId: data.reportCategoryId } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: "This report is already attached" }, { status: 400 })
    }

    const link = await prisma.reportRule.create({
      data: { parentCategoryId: data.parentCategoryId, reportCategoryId: data.reportCategoryId, active: data.active ?? true },
    })
    return NextResponse.json(link)
  } catch (error) {
    console.error("Failed to attach report:", error)
    return NextResponse.json({ error: "Failed to attach" }, { status: 500 })
  }
}
