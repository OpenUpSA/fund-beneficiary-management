import prisma from "@/db"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunders } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { funder_id: string } }
) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!canViewFunders(user)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { funder_id } = params

  try {
    // Fetch all FundFunder relationships for this funder
    const fundFunders = await prisma.fundFunder.findMany({
      where: {
        funderId: Number(funder_id)
      },
      include: {
        fund: {
          include: {
            focusAreas: true,
            organisationDetail: true
          }
        }
      }
    })

    return NextResponse.json(fundFunders)
  } catch (error) {
    console.error('Error fetching funder funds:', error)
    return NextResponse.json(
      { error: "Failed to fetch funds" },
      { status: 500 }
    )
  }
}
