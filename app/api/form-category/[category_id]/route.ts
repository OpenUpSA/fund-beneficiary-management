import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { revalidateTag } from "next/cache"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { formCategoryInputError } from "@/lib/form-category"
import { applyRegroup, planRegroup } from "@/lib/primary-form"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function authorise() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied - only superuser can manage form categories" }, { status: 403 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { category_id: string } }) {
  const denied = await authorise()
  if (denied) return denied

  try {
    const id = Number(params.category_id)
    const existing = Number.isSafeInteger(id)
      ? await prisma.formCategory.findUnique({
          where: { id },
          include: { _count: { select: { childCategories: true } } },
        })
      : null
    if (!existing) {
      return NextResponse.json({ error: "Form category not found" }, { status: 404 })
    }

    const data = await req.json()
    const error = await formCategoryInputError(data, existing)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }
    // Secondary categories point at a primary; it can't stop being one under them
    if (existing.role === "PRIMARY" && data.role && data.role !== "PRIMARY" && existing._count.childCategories > 0) {
      return NextResponse.json(
        { error: "Move the secondary categories under this one elsewhere before changing its role" },
        { status: 400 }
      )
    }

    const updated = await prisma.formCategory.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label.trim() }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.parentCategoryId !== undefined && { parentCategoryId: data.parentCategoryId }),
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    // A new role or parent changes where existing forms sit
    if (updated.role !== existing.role || updated.parentCategoryId !== existing.parentCategoryId) {
      await applyRegroup(await planRegroup())
      revalidateTag("lda-forms:list")
    }
    revalidateTag("form-templates:list")
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update form category:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { category_id: string } }) {
  const denied = await authorise()
  if (denied) return denied

  try {
    const id = Number(params.category_id)
    const existing = Number.isSafeInteger(id)
      ? await prisma.formCategory.findUnique({
          where: { id },
          include: { _count: { select: { templates: true, childCategories: true } } },
        })
      : null
    if (!existing) {
      return NextResponse.json({ error: "Form category not found" }, { status: 404 })
    }
    if (existing._count.templates > 0 || existing._count.childCategories > 0) {
      return NextResponse.json(
        { error: "Only an empty category can be deleted: move its templates and secondary categories first" },
        { status: 400 }
      )
    }

    await prisma.formCategory.delete({ where: { id } })
    revalidateTag("form-templates:list")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete form category:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
