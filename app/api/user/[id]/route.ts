import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { createHash } from '@/lib/hash'

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = Number(params.id)

  if (Number.isNaN(userId)) {
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

    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { localDevelopmentAgencies: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: `User not found` }, { status: 404 })
    }

    // Extract password fields separately so we don't spread them into the update
    const { ldaId, password, passwordConfirm, ...rest } = body as {
      ldaId?: number | string
      password?: string
      passwordConfirm?: string
      [key: string]: unknown
    }

    // If switching to USER role, require an LDA
    if (rest.role === 'USER' && !ldaId) {
      return NextResponse.json({ 
        error: "An LDA must be selected when the role is USER" 
      }, { status: 400 })
    }

    // Build update payload
    const updateData: Record<string, unknown> = { ...rest }

    // Password handling (optional update)
    if (typeof password === 'string' && password.length > 0) {
      if (password !== passwordConfirm) {
        return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
      }
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      const hashedPassword = await createHash(password)
      updateData.passwordHash = hashedPassword
    }

    // Handle role changes and LDA connections
    const ldaIdNum = ldaId !== undefined ? Number(ldaId) : undefined
    const ldaRelation = rest.role === 'USER'
      ? { set: ldaIdNum ? [{ id: ldaIdNum }] : [] }
      : { set: [] }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        localDevelopmentAgencies: ldaRelation
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
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }
    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    })
    return NextResponse.json(deletedUser)
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
