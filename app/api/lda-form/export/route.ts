import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { permissions } from "@/lib/permissions"
import { Form } from "@/types/forms"
import {
  buildJsonExport,
  buildMatrixHeader,
  buildMatrixRow,
  buildResponseRows,
  repeatableMaxEntries,
  toCSV,
  FormData,
} from "@/lib/form-response-export"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const META_COLUMNS = ["LDA", "Form title", "Status", "Submitted"]

export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isAdmin(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  const idsParam = req.nextUrl.searchParams.get("ids")
  const ids = (idsParam ?? "")
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id))

  if (ids.length === 0) {
    return NextResponse.json({ error: "No response ids provided" }, { status: 400 })
  }

  const responses = await prisma.localDevelopmentAgencyForm.findMany({
    where: { id: { in: ids } },
    include: {
      formTemplate: true,
      localDevelopmentAgency: { select: { name: true } },
      formStatus: { select: { label: true } },
    },
  })

  if (responses.length === 0) {
    return NextResponse.json({ error: "No responses found" }, { status: 404 })
  }

  const templateIds = new Set(responses.map((r) => r.formTemplateId))
  if (templateIds.size > 1) {
    return NextResponse.json(
      { error: "All responses must belong to the same form template" },
      { status: 400 }
    )
  }

  const template = responses[0].formTemplate
  const form = template.form as unknown as Form
  if (!form?.sections) {
    return NextResponse.json({ error: "Form template has no structure" }, { status: 400 })
  }

  const format = req.nextUrl.searchParams.get("format") ?? "csv"

  if (format === "json") {
    const doc = buildJsonExport(
      form,
      { id: template.id, name: template.name },
      responses.map((r) => ({
        ldaFormId: r.id,
        ldaId: r.localDevelopmentAgencyId,
        ldaName: r.localDevelopmentAgency.name,
        status: r.formStatus.label,
        submitted: r.submitted?.toISOString() ?? null,
        formData: r.formData as FormData,
      }))
    )
    return new NextResponse(JSON.stringify(doc, null, 2), {
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Content-Disposition": `attachment; filename="${template.name.replace(/\s+/g, "_")}_responses.json"`,
      },
    })
  }

  let csv: string
  let filename: string

  if (responses.length === 1) {
    // Single response: tall Section/Question/Answer layout
    const r = responses[0]
    const rows = buildResponseRows(form, r.formData as FormData)
    csv = toCSV([
      ["LDA", r.localDevelopmentAgency.name, ""],
      ["Status", r.formStatus.label, ""],
      ["Submitted", r.submitted?.toISOString() ?? "", ""],
      ...rows,
    ])
    filename = `${r.title.replace(/\s+/g, "_")}.csv`
  } else {
    // Multiple responses: one row per response, one column per question.
    // Repeatables expand into per-entry column groups sized by the largest
    // entry count in this export.
    const repeatCounts = repeatableMaxEntries(form, responses.map((r) => r.formData as FormData))
    const header = [...META_COLUMNS, ...buildMatrixHeader(form, repeatCounts)]
    const rows = responses.map((r) => [
      r.localDevelopmentAgency.name,
      r.title,
      r.formStatus.label,
      r.submitted?.toISOString() ?? "",
      ...buildMatrixRow(form, r.formData as FormData, repeatCounts),
    ])
    csv = toCSV([header, ...rows])
    filename = `${template.name.replace(/\s+/g, "_")}_responses.csv`
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
