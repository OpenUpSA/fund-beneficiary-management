import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions, canFillForm, canApproveForm } from "@/lib/permissions"
import { refreshTitles } from "@/lib/form-title"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_TITLE_LENGTH = 200

/**
 * Change a form's title. Anyone who can fill in or approve the form may.
 * An empty title goes back to the automatic one (template name + period).
 */
export async function PUT(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const id = Number(params.lda_form_id)
  const form = Number.isSafeInteger(id)
    ? await prisma.localDevelopmentAgencyForm.findUnique({
        where: { id },
        select: { localDevelopmentAgencyId: true, formTemplate: { select: { fillRoles: true, approveRoles: true } } },
      })
    : null
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }
  if (
    !permissions.canViewLDA(user, form.localDevelopmentAgencyId) ||
    !(canFillForm(user, form.formTemplate.fillRoles) || canApproveForm(user, form.formTemplate.approveRoles))
  ) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (body.title !== null && typeof body.title !== "string") {
      return NextResponse.json({ error: "Title must be text" }, { status: 400 })
    }
    const title = (body.title ?? "").trim()
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `Keep the title under ${MAX_TITLE_LENGTH} characters` }, { status: 400 })
    }

    if (title) {
      await prisma.localDevelopmentAgencyForm.update({ where: { id }, data: { title, customTitle: true } })
    } else {
      await prisma.localDevelopmentAgencyForm.update({ where: { id }, data: { customTitle: false } })
      await refreshTitles([id])
    }
    const updated = await prisma.localDevelopmentAgencyForm.findUnique({ where: { id }, select: { id: true, title: true, customTitle: true } })
    revalidateTag("lda-forms:list")
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update form title:", error)
    return NextResponse.json({ error: "Failed to update the title" }, { status: 500 })
  }
}
