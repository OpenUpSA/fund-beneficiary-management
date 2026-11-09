import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { upcomingReports } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Periodic reports opening in the next `days` (default 90), with LDA and report names. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days")) || 90, 1), 366)
  const upcoming = await upcomingReports(new Date(), days)

  const [ldas, categories] = await Promise.all([
    prisma.localDevelopmentAgency.findMany({
      where: { id: { in: [...new Set(upcoming.map((u) => u.ldaId))] } },
      select: { id: true, name: true },
    }),
    prisma.formCategory.findMany({
      where: { id: { in: [...new Set(upcoming.map((u) => u.reportCategoryId))] } },
      select: { id: true, label: true },
    }),
  ])
  return NextResponse.json(
    upcoming.map((u) => ({
      ...u,
      ldaName: ldas.find((l) => l.id === u.ldaId)?.name ?? "",
      reportName: categories.find((c) => c.id === u.reportCategoryId)?.label ?? "",
    }))
  )
}
