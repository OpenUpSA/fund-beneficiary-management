import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { createHash } from '@/lib/hash'

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
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
    const data = await req.json()
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
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}