import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_id: string } }) {
  const ldaId = parseInt(params.lda_id, 10);

  const records = await prisma.contact.findMany({
    where: { localDevelopmentAgencies: { some: { id: ldaId } } },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest, { params }: { params: { lda_id: string } }) {
  try {
    const ldaId = parseInt(params.lda_id, 10);
    if (isNaN(ldaId)) {
      return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 });
    }
    
    const data = await req.json();
    const record = await prisma.contact.create({
      data: {
        ...data,
        localDevelopmentAgencies: {
          connect: { id: ldaId }
        }
      }
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to create contact:", error);
    return NextResponse.json({ error: "Failed to create contact", detail: (error as Error).message }, { status: 500 });
  }
}
