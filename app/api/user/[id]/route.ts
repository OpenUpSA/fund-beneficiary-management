import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { createHash } from '@/lib/hash'
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const currentUser = session?.user || null;
  
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = Number(params.id)

  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  // SuperUser/Admin can view any user; everyone else may view only their own account.
  const isPrivileged = permissions.isSuperUser(currentUser) || permissions.isAdmin(currentUser)
  if (!isPrivileged && Number(currentUser.id) !== userId) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
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
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const currentUser = session?.user || null;
    
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const userId = Number(params.id)
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const isPrivileged = permissions.isSuperUser(currentUser) || permissions.isAdmin(currentUser)
    const isSelf = Number(currentUser.id) === userId

    // SuperUser/Admin can edit any user; everyone else may edit only their own account.
    if (!isPrivileged && !isSelf) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json()

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

    // Validate a password change if one was supplied (shared by self + admin paths)
    let hashedPassword: string | undefined
    if (typeof password === 'string' && password.length > 0) {
      if (password !== passwordConfirm) {
        return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
      }
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      hashedPassword = await createHash(password)
    }

    // Self-service (non-privileged) users may change only their own name, email and
    // password — never role, approval status or LDA membership (privilege escalation).
    if (!isPrivileged) {
      const selfUpdate: Record<string, unknown> = {}
      if (typeof rest.name === 'string') selfUpdate.name = rest.name
      if (typeof rest.email === 'string') selfUpdate.email = rest.email
      if (hashedPassword) selfUpdate.passwordHash = hashedPassword

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: selfUpdate,
        include: { localDevelopmentAgencies: true }
      })
      return NextResponse.json(updatedUser)
    }

    // Additional permission check for admin users (editing others)
    if (permissions.isAdmin(currentUser) && !permissions.isSuperUser(currentUser)) {
      // Admin can only edit PROGRAMME_OFFICER and USER (LDA User)
      if (existingUser.role !== 'PROGRAMME_OFFICER' && existingUser.role !== 'USER') {
        return NextResponse.json({ error: "Permission denied - admin can only edit Programme Officer and LDA User accounts" }, { status: 403 });
      }

      // If changing role, admin can only change to PROGRAMME_OFFICER or USER (LDA User)
      if (body.role && body.role !== 'PROGRAMME_OFFICER' && body.role !== 'USER') {
        return NextResponse.json({ error: "Permission denied - admin can only set role to Programme Officer or LDA User" }, { status: 403 });
      }
    }

    // If switching to USER role, require an LDA
    if (rest.role === 'USER' && !ldaId) {
      return NextResponse.json({
        error: "An LDA must be selected when the role is USER"
      }, { status: 400 })
    }

    // Build update payload
    const updateData: Record<string, unknown> = { ...rest }
    if (hashedPassword) {
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
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const currentUser = session?.user || null;
    
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Permission check: Only superuser and admin can delete users
    if (!permissions.isSuperUser(currentUser) && !permissions.isAdmin(currentUser)) {
      return NextResponse.json({ error: "Permission denied - only superuser and admin can delete users" }, { status: 403 });
    }

    const userId = Number(params.id)
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    // For admin users, check if they can delete this user
    if (permissions.isAdmin(currentUser) && !permissions.isSuperUser(currentUser)) {
      const userToDelete = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!userToDelete) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Admin can only delete PROGRAMME_OFFICER and USER (LDA User)
      if (userToDelete.role !== 'PROGRAMME_OFFICER' && userToDelete.role !== 'USER') {
        return NextResponse.json({ error: "Permission denied - admin can only delete Programme Officer and LDA User accounts" }, { status: 403 });
      }
    }

    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    })
    return NextResponse.json(deletedUser)
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
