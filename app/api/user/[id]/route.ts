import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = Number(params.id)

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      localDevelopmentAgencies: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const userId = Number(params.id)

    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { localDevelopmentAgencies: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: `User not found` }, { status: 404 })
    }

    const { ldaId, ...rest } = body

    // If switching to USER role, require an LDA
    if (rest.role === 'USER' && !ldaId) {
      return NextResponse.json({ 
        error: "An LDA must be selected when the role is USER" 
      }, { status: 400 })
    }

    // Handle role changes and LDA connections
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        localDevelopmentAgencies: {
          set: rest.role === 'USER' 
            ? [{ id: parseInt(ldaId) }]  // For USER role, set to selected LDA
            : []  // For non-USER roles, clear all LDAs
        }
      },
      include: {
        localDevelopmentAgencies: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Failed to update user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = Number(params.id)
    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    })
    return NextResponse.json(deletedUser)
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
