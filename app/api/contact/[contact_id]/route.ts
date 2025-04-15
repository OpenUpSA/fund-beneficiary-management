import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { contact_id: string } }) {
  const contactId = parseInt(params.contact_id, 10)

  const record = await prisma.contact.findUnique({
    where: { id: contactId }
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { contact_id: string } }) {
  const contactId = parseInt(params.contact_id, 10);

  try {
    const data = await req.json();
    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update LDA:", err);
    return NextResponse.json({ error: "Failed to update", detail: (err as Error).message }, { status: 500 });
  }
}
