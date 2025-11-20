import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canManageFund } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Permission check
  if (!canManageFund(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { fundId, localDevelopmentAgencyId, description, fundingStart, fundingEnd, fundingStatus } = body

    // Validate required fields
    if (!fundId || !localDevelopmentAgencyId || !fundingStart || !fundingEnd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const parsedFundId = parseInt(fundId)
    const parsedLDAId = parseInt(localDevelopmentAgencyId)

    if (isNaN(parsedFundId) || isNaN(parsedLDAId)) {
      return NextResponse.json({ error: "Invalid fund or LDA ID" }, { status: 400 })
    }

    // Check if fund exists
    const fund = await prisma.fund.findUnique({
      where: { id: parsedFundId }
    })

    if (!fund) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 })
    }

    // Check if LDA exists
    const lda = await prisma.localDevelopmentAgency.findUnique({
      where: { id: parsedLDAId }
    })

    if (!lda) {
      return NextResponse.json({ error: "LDA not found" }, { status: 404 })
    }

    // Check if link already exists
    const existingLink = await prisma.fundLocalDevelopmentAgency.findFirst({
      where: {
        fundId: parsedFundId,
        localDevelopmentAgencyId: parsedLDAId
      }
    })

    if (existingLink) {
      return NextResponse.json(
        { error: "This LDA is already linked to this fund" },
        { status: 409 }
      )
    }

    // Create the link
    const fundLDA = await prisma.fundLocalDevelopmentAgency.create({
      data: {
        fundId: parsedFundId,
        localDevelopmentAgencyId: parsedLDAId,
        description: description || "",
        fundingStart: new Date(fundingStart),
        fundingEnd: new Date(fundingEnd),
        fundingStatus: fundingStatus || "Active",
      },
      include: {
        localDevelopmentAgency: true,
        fund: true
      }
    })

    return NextResponse.json(fundLDA, { status: 201 })
  } catch (error) {
    console.error("Error linking LDA to fund:", error)
    return NextResponse.json(
      { error: "Failed to link LDA to fund" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Permission check
  if (!canManageFund(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { fundId, localDevelopmentAgencyId, description, fundingStart, fundingEnd, fundingStatus } = body

    // Validate required fields
    if (!fundId || !localDevelopmentAgencyId || !fundingStart || !fundingEnd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const parsedFundId = parseInt(fundId)
    const parsedLDAId = parseInt(localDevelopmentAgencyId)

    if (isNaN(parsedFundId) || isNaN(parsedLDAId)) {
      return NextResponse.json({ error: "Invalid fund or LDA ID" }, { status: 400 })
    }

    // Check if the link exists
    const existingLink = await prisma.fundLocalDevelopmentAgency.findFirst({
      where: {
        fundId: parsedFundId,
        localDevelopmentAgencyId: parsedLDAId
      }
    })

    if (!existingLink) {
      return NextResponse.json(
        { error: "Funding relationship not found" },
        { status: 404 }
      )
    }

    // Update the link
    const updatedFundLDA = await prisma.fundLocalDevelopmentAgency.update({
      where: {
        id: existingLink.id
      },
      data: {
        description: description || "",
        fundingStart: new Date(fundingStart),
        fundingEnd: new Date(fundingEnd),
        fundingStatus: fundingStatus || "Active",
      },
      include: {
        localDevelopmentAgency: true,
        fund: true
      }
    })

    return NextResponse.json(updatedFundLDA, { status: 200 })
  } catch (error) {
    console.error("Error updating funding:", error)
    return NextResponse.json(
      { error: "Failed to update funding" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Permission check
  if (!canManageFund(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { fundId, ldaId } = body

    // Validate required fields
    if (!fundId || !ldaId) {
      return NextResponse.json(
        { error: "Missing required fields: fundId and ldaId" },
        { status: 400 }
      )
    }

    const parsedFundId = parseInt(fundId)
    const parsedLDAId = parseInt(ldaId)

    if (isNaN(parsedFundId) || isNaN(parsedLDAId)) {
      return NextResponse.json({ error: "Invalid fund or LDA ID" }, { status: 400 })
    }

    // Check if the link exists
    const existingLink = await prisma.fundLocalDevelopmentAgency.findFirst({
      where: {
        fundId: parsedFundId,
        localDevelopmentAgencyId: parsedLDAId
      }
    })

    if (!existingLink) {
      return NextResponse.json(
        { error: "Funding relationship not found" },
        { status: 404 }
      )
    }

    // Delete the link
    await prisma.fundLocalDevelopmentAgency.delete({
      where: {
        id: existingLink.id
      }
    })

    return NextResponse.json(
      { message: "Funding removed successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error removing funding:", error)
    return NextResponse.json(
      { error: "Failed to remove funding" },
      { status: 500 }
    )
  }
}
