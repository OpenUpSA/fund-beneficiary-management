import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { lda_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const ldaId = parseInt(params.lda_id)
    if (isNaN(ldaId)) {
      return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 })
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const quarterStart = searchParams.get("quarterStart")
    const quarterEnd = searchParams.get("quarterEnd")
    const templateNames = searchParams.get("templateNames")?.split(",").filter(Boolean) || []
    const formCategories = searchParams.get("formCategories")?.split(",").filter(Boolean) || []

    if (!quarterStart || !quarterEnd) {
      return NextResponse.json(
        { error: "quarterStart and quarterEnd are required" },
        { status: 400 }
      )
    }

    const startDate = new Date(quarterStart)
    const endDate = new Date(quarterEnd)

    // Get the Approved status
    const approvedStatus = await prisma.formStatus.findFirst({
      where: { label: "Approved" },
    })

    if (!approvedStatus) {
      return NextResponse.json({ error: "Approved status not found" }, { status: 500 })
    }

    // Build where clause - only return approved forms
    const whereClause: {
      localDevelopmentAgencyId: number
      formStatusId: number
      formTemplate?: { name?: { in: string[] }; formCategory?: { in: string[] } }
      OR: Array<{
        fundingStart?: { gte: Date; lte: Date }
        fundingEnd?: { gte: Date; lte: Date }
        AND?: Array<{ fundingStart?: { lte: Date }; fundingEnd?: { gte: Date } }>
      }>
    } = {
      localDevelopmentAgencyId: ldaId,
      formStatusId: approvedStatus.id,
      OR: [
        {
          // Form starts within the quarter
          fundingStart: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Form ends within the quarter
          fundingEnd: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Form spans the entire quarter
          AND: [
            { fundingStart: { lte: startDate } },
            { fundingEnd: { gte: endDate } },
          ],
        },
      ],
    }

    // Add template filters if specified
    if (templateNames.length > 0 || formCategories.length > 0) {
      whereClause.formTemplate = {}
      if (templateNames.length > 0) {
        whereClause.formTemplate.name = { in: templateNames }
      }
      if (formCategories.length > 0) {
        whereClause.formTemplate.formCategory = { in: formCategories }
      }
    }

    // Fetch forms for this LDA within the quarter timeframe
    const forms = await prisma.localDevelopmentAgencyForm.findMany({
      where: whereClause,
      include: {
        formTemplate: {
          select: {
            id: true,
            name: true,
            templateType: true,
            formCategory: true,
          },
        },
        formStatus: true,
      },
      orderBy: {
        fundingStart: "desc",
      },
    })

    // Format response
    const formattedForms = forms.map((form) => ({
      id: form.id,
      title: form.title,
      templateName: form.formTemplate.name,
      templateType: form.formTemplate.templateType,
      formCategory: form.formTemplate.formCategory,
      status: form.formStatus.label,
      fundingStart: form.fundingStart,
      fundingEnd: form.fundingEnd,
      amount: form.amount,
    }))

    return NextResponse.json(formattedForms)
  } catch (error) {
    console.error("Failed to fetch quarter forms:", error)
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    )
  }
}
