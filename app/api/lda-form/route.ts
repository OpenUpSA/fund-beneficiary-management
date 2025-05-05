import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.localDevelopmentAgencyForm.findMany({
    include: {
      localDevelopmentAgency: true,
      formTemplate: true,
      formStatus: true
    },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const query = {
      data: data,
    }
    const record = await prisma.localDevelopmentAgencyForm.create(query)

    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}