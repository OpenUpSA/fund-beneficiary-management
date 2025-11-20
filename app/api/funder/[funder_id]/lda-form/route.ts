import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canManageFunder, permissions } from "@/lib/permissions"
import { LocalDevelopmentAgencyForm } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { funder_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const funderId = parseInt(params.funder_id)

  if (isNaN(funderId)) {
    return NextResponse.json({ error: "Invalid funder ID" }, { status: 400 })
  }

  try {
    // Get the funder with its linked funds
    const funder = await prisma.funder.findUnique({
      where: { id: funderId },
      include: {
        fundFunders: {
          include: {
            fund: {
              include: {
                fundLocalDevelopmentAgencies: {
                  include: {
                    localDevelopmentAgency: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!funder) {
      return NextResponse.json({ error: "Funder not found" }, { status: 404 })
    }

    // Check if user can view this funder
    if (!canManageFunder(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all unique LDA IDs linked to this funder through its funds
    const ldaIds = new Set<number>()
    funder.fundFunders.forEach((fundFunder) => {
      fundFunder.fund.fundLocalDevelopmentAgencies.forEach((fundLda) => {
        ldaIds.add(fundLda.localDevelopmentAgencyId)
      })
    })

    // Get all forms for these LDAs
    const allForms = await prisma.localDevelopmentAgencyForm.findMany({
      where: {
        localDevelopmentAgencyId: {
          in: Array.from(ldaIds)
        }
      },
      include: {
        localDevelopmentAgency: {
          include: {
            organisationDetail: true
          }
        },
        formTemplate: true,
        formStatus: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filter forms based on canViewLDA permission
    const filteredForms = allForms.filter((form: LocalDevelopmentAgencyForm) =>
      permissions.canViewLDA(user, form.localDevelopmentAgencyId)
    )

    return NextResponse.json(filteredForms)
  } catch (error) {
    console.error("Error fetching LDA forms for funder:", error)
    return NextResponse.json(
      { error: "Failed to fetch LDA forms" },
      { status: 500 }
    )
  }
}
