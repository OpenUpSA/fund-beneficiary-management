import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { revalidateTag } from "next/cache"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { formCategoryInputError, uniqueCategoryKey } from "@/lib/form-category"
import { reportTimingInputError, TIMING_FIELDS } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const categories = await prisma.formCategory.findMany({
    orderBy: { label: "asc" },
    include: {
      templates: {
        select: {
          id: true,
          name: true,
          active: true,
          templateType: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { reportOverrides: true, localDevelopmentAgencyForms: true } },
        },
        orderBy: { name: "asc" },
      },
      reportRules: {
        orderBy: { id: "asc" },
        include: { _count: { select: { overrides: true, plannedReports: true } } },
      },
    },
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied - only superuser can manage form categories" }, { status: 403 })
  }

  try {
    const data = await req.json()
    // The key is internal: made from the label unless a script passes one
    if (data.key === undefined && typeof data.label === "string" && data.label.trim()) {
      data.key = await uniqueCategoryKey(data.label)
    }
    const timing = Object.fromEntries(TIMING_FIELDS.filter((f) => data[f] !== undefined).map((f) => [f, data[f]]))
    const error = await formCategoryInputError(data)
      ?? (Object.keys(timing).length > 0 && data.role !== "REPORT" ? "Only report categories have report timing" : undefined)
      ?? (await reportTimingInputError(timing))
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const category = await prisma.formCategory.create({
      data: {
        key: data.key,
        label: data.label.trim(),
        role: data.role,
        parentCategoryId: data.parentCategoryId ?? null,
        active: data.active ?? true,
        ...timing,
      },
    })
    revalidateTag("form-templates:list")
    return NextResponse.json(category)
  } catch (error) {
    console.error("Failed to create form category:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
