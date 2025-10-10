import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { createHash } from '@/lib/hash'
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const records = await prisma.user.findMany(
    {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approved: true,
        createdAt: true,
        updatedAt: true,
        localDevelopmentAgencies: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }
  )
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const data = await req.json()
    
    // Permission check: Only superuser and admin can create users
    if (!permissions.isSuperUser(user) && !permissions.isAdmin(user)) {
      return NextResponse.json({ error: "Permission denied - only superuser and admin can create users" }, { status: 403 });
    }

    // Additional permission check for admin users
    if (permissions.isAdmin(user) && !permissions.isSuperUser(user)) {
      // Admin can only create PROGRAMME_OFFICER and USER (LDA User)
      if (data.role !== 'PROGRAMME_OFFICER' && data.role !== 'USER') {
        return NextResponse.json({ error: "Permission denied - admin can only create Programme Officer and LDA User accounts" }, { status: 403 });
      }
    }

    const hashedPassword = await createHash(data.password)
    const query = {
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        approved: data.approved,
        passwordHash: hashedPassword,
        ...(data.ldaId && {
          localDevelopmentAgencies: {
            connect: [{ id: parseInt(data.ldaId) }]
          }
        })
      },
      include: {
        localDevelopmentAgencies: true
      }
    }
    const record = await prisma.user.create(query)

    return NextResponse.json(record)
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}