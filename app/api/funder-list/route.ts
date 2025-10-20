import { NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.funder.findMany({
    select: {
      id: true,
      name: true
    },
  })

  return NextResponse.json(records)
}
