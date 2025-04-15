import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { organisation_detail_id: string } }) {
  const organisationDetailId = parseInt(params.organisation_detail_id, 10)

  const record = await prisma.organisationDetail.findUnique({
    where: { id: organisationDetailId },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { organisation_detail_id: string } }) {
  const organisationDetailId = parseInt(params.organisation_detail_id, 10)

  try {
    const data = await req.json()

    const updated = await prisma.organisationDetail.update({
      where: { id: organisationDetailId },
      data: data
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
