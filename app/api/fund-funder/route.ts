import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { revalidateTag } from "next/cache"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canManageFund } from "@/lib/permissions"
import imagekit from "@/lib/imagekit"

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
    const formData = await req.formData()
    const fundId = formData.get("fundId") as string
    const funderId = formData.get("funderId") as string
    const amount = formData.get("amount") as string
    const fundingStart = formData.get("fundingStart") as string
    const fundingEnd = formData.get("fundingEnd") as string
    const notes = formData.get("notes") as string

    // Validate required fields
    if (!fundId || !funderId || !amount || !fundingStart || !fundingEnd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const parsedFundId = parseInt(fundId)
    const parsedFunderId = parseInt(funderId)

    if (isNaN(parsedFundId) || isNaN(parsedFunderId)) {
      return NextResponse.json({ error: "Invalid fund or funder ID" }, { status: 400 })
    }

    // Check if fund exists
    const fund = await prisma.fund.findUnique({
      where: { id: parsedFundId }
    })

    if (!fund) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 })
    }

    // Check if funder exists
    const funder = await prisma.funder.findUnique({
      where: { id: parsedFunderId }
    })

    if (!funder) {
      return NextResponse.json({ error: "Funder not found" }, { status: 404 })
    }

    // Check if link already exists
    const existingLink = await prisma.fundFunder.findFirst({
      where: {
        fundId: parsedFundId,
        funderId: parsedFunderId
      }
    })

    if (existingLink) {
      return NextResponse.json(
        { error: "This funder is already linked to this fund" },
        { status: 409 }
      )
    }

    // Create the link
    const fundFunder = await prisma.fundFunder.create({
      data: {
        fundId: parsedFundId,
        funderId: parsedFunderId,
        amount: parseFloat(amount),
        fundingStart: new Date(fundingStart),
        fundingEnd: new Date(fundingEnd),
        notes: notes || "",
      },
      include: {
        funder: true,
        fund: true
      }
    })

    // Handle document uploads
    const documentFiles: File[] = []
    const entries = Array.from(formData.entries())
    
    for (const [key, value] of entries) {
      if (key.startsWith('document_') && value instanceof File) {
        documentFiles.push(value)
      }
    }

    // Upload documents and create Document records
    const uploadedDocuments = []
    for (const file of documentFiles) {
      try {
        // Upload to ImageKit
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        const fileBase64 = fileBuffer.toString("base64")
        
        const uploadResponse = await imagekit.upload({
          file: fileBase64,
          fileName: file.name,
        })

        // Create Document record linked to both fund and funder
        const document = await prisma.document.create({
          data: {
            title: file.name,
            description: `Contract document for ${fund.name} - ${funder.name}`,
            filePath: uploadResponse.filePath,
            validFromDate: new Date(fundingStart),
            validUntilDate: new Date(fundingEnd),
            uploadedBy: 'SCAT',
            fund: { connect: { id: parsedFundId } },
            funder: { connect: { id: parsedFunderId } },
            createdBy: { connect: { id: parseInt(user.id as string) } }
          }
        })
        
        uploadedDocuments.push(document)
      } catch (uploadError) {
        console.error(`Error uploading document ${file.name}:`, uploadError)
        // Continue with other documents even if one fails
      }
    }

    // Revalidate cache tags
    revalidateTag(`funder-${parsedFunderId}`)
    revalidateTag(`fund-${parsedFundId}`)
    revalidateTag('funders')
    revalidateTag('funds')

    return NextResponse.json(fundFunder, { status: 201 })
  } catch (error) {
    console.error("Error linking funder to fund:", error)
    return NextResponse.json(
      { error: "Failed to link funder to fund" },
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
    const formData = await req.formData()
    const fundId = formData.get("fundId") as string
    const funderId = formData.get("funderId") as string
    const amount = formData.get("amount") as string
    const fundingStart = formData.get("fundingStart") as string
    const fundingEnd = formData.get("fundingEnd") as string
    const notes = formData.get("notes") as string

    // Validate required fields
    if (!fundId || !funderId || !amount || !fundingStart || !fundingEnd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const parsedFundId = parseInt(fundId)
    const parsedFunderId = parseInt(funderId)

    if (isNaN(parsedFundId) || isNaN(parsedFunderId)) {
      return NextResponse.json({ error: "Invalid fund or funder ID" }, { status: 400 })
    }

    // Check if link exists
    const existingLink = await prisma.fundFunder.findFirst({
      where: {
        fundId: parsedFundId,
        funderId: parsedFunderId
      }
    })

    if (!existingLink) {
      return NextResponse.json(
        { error: "Fund-funder relationship not found" },
        { status: 404 }
      )
    }

    // Get fund and funder for document descriptions
    const [fund, funder] = await Promise.all([
      prisma.fund.findUnique({ where: { id: parsedFundId } }),
      prisma.funder.findUnique({ where: { id: parsedFunderId } })
    ])

    // Update the link
    const updatedFundFunder = await prisma.fundFunder.update({
      where: {
        fundId_funderId: {
          fundId: parsedFundId,
          funderId: parsedFunderId
        }
      },
      data: {
        amount: parseFloat(amount),
        fundingStart: new Date(fundingStart),
        fundingEnd: new Date(fundingEnd),
        notes: notes || "",
      },
      include: {
        funder: true,
        fund: true
      }
    })

    // Handle document uploads
    const documentFiles: File[] = []
    const entries = Array.from(formData.entries())
    
    for (const [key, value] of entries) {
      if (key.startsWith('document_') && value instanceof File) {
        documentFiles.push(value)
      }
    }

    // Upload documents and create Document records
    const uploadedDocuments = []
    for (const file of documentFiles) {
      try {
        // Upload to ImageKit
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        const fileBase64 = fileBuffer.toString("base64")
        
        const uploadResponse = await imagekit.upload({
          file: fileBase64,
          fileName: file.name,
        })

        // Create Document record linked to both fund and funder
        const document = await prisma.document.create({
          data: {
            title: file.name,
            description: `Contract document for ${fund?.name} - ${funder?.name}`,
            filePath: uploadResponse.filePath,
            validFromDate: new Date(fundingStart),
            validUntilDate: new Date(fundingEnd),
            uploadedBy: 'SCAT',
            fund: { connect: { id: parsedFundId } },
            funder: { connect: { id: parsedFunderId } },
            createdBy: { connect: { id: parseInt(user.id as string) } }
          }
        })
        
        uploadedDocuments.push(document)
      } catch (uploadError) {
        console.error(`Error uploading document ${file.name}:`, uploadError)
        // Continue with other documents even if one fails
      }
    }

    // Revalidate cache tags
    revalidateTag(`funder-${parsedFunderId}`)
    revalidateTag(`fund-${parsedFundId}`)
    revalidateTag('funders')
    revalidateTag('funds')

    return NextResponse.json(updatedFundFunder, { status: 200 })
  } catch (error) {
    console.error("Error updating fund-funder relationship:", error)
    return NextResponse.json(
      { error: "Failed to update fund-funder relationship" },
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
    const { fundId, funderId } = body

    // Validate required fields
    if (!fundId || !funderId) {
      return NextResponse.json(
        { error: "Missing required fields: fundId and funderId" },
        { status: 400 }
      )
    }

    const parsedFundId = parseInt(fundId)
    const parsedFunderId = parseInt(funderId)

    if (isNaN(parsedFundId) || isNaN(parsedFunderId)) {
      return NextResponse.json({ error: "Invalid fund or funder ID" }, { status: 400 })
    }

    // Check if link exists
    const existingLink = await prisma.fundFunder.findFirst({
      where: {
        fundId: parsedFundId,
        funderId: parsedFunderId
      }
    })

    if (!existingLink) {
      return NextResponse.json(
        { error: "Fund-funder relationship not found" },
        { status: 404 }
      )
    }

    // Delete the link
    await prisma.fundFunder.delete({
      where: {
        fundId_funderId: {
          fundId: parsedFundId,
          funderId: parsedFunderId
        }
      }
    })

    // Revalidate cache tags
    revalidateTag(`funder-${parsedFunderId}`)
    revalidateTag(`fund-${parsedFundId}`)
    revalidateTag('funders')
    revalidateTag('funds')

    return NextResponse.json({ message: "Fund-funder relationship deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting fund-funder relationship:", error)
    return NextResponse.json(
      { error: "Failed to delete fund-funder relationship" },
      { status: 500 }
    )
  }
}
