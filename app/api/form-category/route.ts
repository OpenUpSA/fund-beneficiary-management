import { NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const categories = await prisma.formCategory.findMany({ orderBy: { label: "asc" } })
  return NextResponse.json(categories)
}
