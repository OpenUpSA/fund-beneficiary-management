import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ldaId = parseInt(params.lda_id, 10);
  
  if (isNaN(ldaId)) {
    return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 });
  }

  // Permission check: Can view LDA
  if (!permissions.canViewLDA(user, ldaId)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const records = await prisma.localDevelopmentAgencyForm.findMany({
    where: { localDevelopmentAgencyId: ldaId },
    include: {
      formStatus: true
    },
  });

  return NextResponse.json(records);
}
