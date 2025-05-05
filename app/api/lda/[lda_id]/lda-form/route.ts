import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_id: string } }) {
  const ldaId = parseInt(params.lda_id, 10)

  const records = await prisma.localDevelopmentAgencyForm.findMany({
    where: { localDevelopmentAgencyId: ldaId },
    include: {
      localDevelopmentAgency: true,
      formTemplate: true,
      formStatus: true
    },
  });

  return NextResponse.json(records);
}
