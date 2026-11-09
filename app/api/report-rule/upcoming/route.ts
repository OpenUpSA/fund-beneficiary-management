import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { upcomingReports } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Planned reports opening in the next `days` (default 90). */
export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days")) || 90, 1), 366)
  return NextResponse.json(await upcomingReports(new Date(), days))
}
