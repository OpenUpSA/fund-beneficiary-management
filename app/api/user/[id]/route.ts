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
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approved: true,
      createdAt: true,
      updatedAt: true
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
    const updateData = body
    const userId = Number(params.id)

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        name: true,
        email: true,
        approved: true,
        role: true
      },
    })

    return NextResponse.json(updatedUser)
  } catch {
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
