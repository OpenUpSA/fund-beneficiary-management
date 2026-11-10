import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { revalidateTag } from "next/cache"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { generateDueReports } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Daily job: create every periodic report that has opened. Called by the Dokku
 * cron in app.json with `Authorization: Bearer $CRON_SECRET`, or by a super user
 * with "Run now" in Admin → Reports. Safe to call any number of times.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const fromCron = !!secret && req.headers.get("authorization") === `Bearer ${secret}`
  if (!fromCron) {
    const session = await getServerSession(NEXT_AUTH_OPTIONS)
    if (!session?.user || !permissions.isSuperUser(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await generateDueReports(new Date())
    if (result.created > 0) revalidateTag("lda-forms:list")
    if (result.errors.length > 0) console.error("Report generation errors:", result.errors)
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...result })
  } catch (error) {
    console.error("Report generation failed:", error)
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 })
  }
}

export const GET = run
export const POST = run
