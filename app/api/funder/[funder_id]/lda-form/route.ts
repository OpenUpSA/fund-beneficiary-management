import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canManageFunder } from "@/lib/permissions"

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
    // Check funder exists and user has access — both in parallel
    const [funderExists, canManage] = await Promise.all([
      prisma.funder.findUnique({ where: { id: funderId }, select: { id: true } }),
      Promise.resolve(canManageFunder(user)),
    ])

    if (!funderExists) {
      return NextResponse.json({ error: "Funder not found" }, { status: 404 })
    }

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get forms for LDAs linked to this funder via a single query using relation filters
    const forms = await prisma.localDevelopmentAgencyForm.findMany({
      where: {
        localDevelopmentAgency: {
          fundLocalDevelopmentAgencies: {
            some: {
              fund: {
                fundFunders: {
                  some: { funderId }
                }
              }
            }
          }
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

    return NextResponse.json(forms)
  } catch (error) {
    console.error("Error fetching LDA forms for funder:", error)
    return NextResponse.json(
      { error: "Failed to fetch LDA forms" },
      { status: 500 }
    )
  }
}
