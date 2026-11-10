import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Every report this form gets, planned and created, oldest period first. Admin Tools users (super users) only. */
export async function GET(_req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }
  const formId = Number(params.lda_form_id)
  if (!Number.isSafeInteger(formId)) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  const rows = await prisma.plannedReport.findMany({
    where: { parentFormId: formId },
    orderBy: [{ periodStart: "asc" }, { period: "asc" }, { id: "asc" }],
    include: {
      reportCategory: { select: { id: true, label: true } },
      triggerStatus: { select: { id: true, label: true } },
      reportForm: { select: { id: true, title: true, localDevelopmentAgencyId: true, formStatus: { select: { label: true } } } },
    },
  })
  return NextResponse.json(rows)
}
