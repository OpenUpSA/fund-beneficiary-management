import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canManageFund, permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { fund_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const fundId = parseInt(params.fund_id)

  if (isNaN(fundId)) {
    return NextResponse.json({ error: "Invalid fund ID" }, { status: 400 })
  }

  try {
    // Get the fund with its linked LDAs
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        fundLocalDevelopmentAgencies: {
          include: {
            localDevelopmentAgency: true
          }
        }
      }
    })

    if (!fund) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 })
    }

    // Check if user can view this fund
    if (!canManageFund(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all LDA IDs linked to this fund
    const ldaIds = fund.fundLocalDevelopmentAgencies.map(
      (fundLda) => fundLda.localDevelopmentAgencyId
    )

    // Apply permission filter at DB level
    const accessibleLdaIds = permissions.canViewAllLDAs(user)
      ? ldaIds
      : ldaIds.filter(id => (user.ldaIds ?? []).includes(id))

    const forms = await prisma.localDevelopmentAgencyForm.findMany({
      where: {
        localDevelopmentAgencyId: { in: accessibleLdaIds }
      },
      omit: { formData: true },
      include: {
        localDevelopmentAgency: {
          include: {
            focusAreas: true,
            developmentStage: true,
            organisationDetail: true
          }
        },
        formTemplate: {
          omit: { form: true }
        },
        formStatus: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(forms)
  } catch (error) {
    console.error("Error fetching LDA forms for fund:", error)
    return NextResponse.json(
      { error: "Failed to fetch LDA forms" },
      { status: 500 }
    )
  }
}
