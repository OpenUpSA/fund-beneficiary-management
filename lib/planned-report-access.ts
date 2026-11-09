import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/db"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canApproveForm, permissions } from "@/lib/permissions"

/**
 * A form's planned reports are for its approvers: they can see the LDA and the
 * template lets their role approve. Returns the form id, or the error response.
 */
export async function authorisePlannedReports(
  ldaFormId: string,
): Promise<{ formId: number; response?: undefined } | { formId?: undefined; response: NextResponse }> {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user
  if (!user) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }
  }
  const formId = Number(ldaFormId)
  const form = Number.isSafeInteger(formId)
    ? await prisma.localDevelopmentAgencyForm.findUnique({
        where: { id: formId },
        select: { localDevelopmentAgencyId: true, formTemplate: { select: { approveRoles: true } } },
      })
    : null
  if (!form) {
    return { response: NextResponse.json({ error: "Form not found" }, { status: 404 }) }
  }
  if (!permissions.canViewLDA(user, form.localDevelopmentAgencyId) || !canApproveForm(user, form.formTemplate.approveRoles)) {
    return { response: NextResponse.json({ error: "Permission denied" }, { status: 403 }) }
  }
  return { formId }
}

/** A planned report of this form, or the 404 response. */
export async function findPlannedReport(formId: number, rowId: string) {
  const id = Number(rowId)
  const row = Number.isSafeInteger(id)
    ? await prisma.plannedReport.findFirst({ where: { id, parentFormId: formId } })
    : null
  if (!row) return { response: NextResponse.json({ error: "Planned report not found" }, { status: 404 }) }
  return { row }
}
