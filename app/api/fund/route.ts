import { NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
// import { permissions, canViewFunds } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url)
  const ldaIdParam = searchParams.get('ldaId')
  const ldaId = ldaIdParam ? parseInt(ldaIdParam) : undefined

  // Check if user can view funds
  // if (!canViewFunds(user)) {
  //   return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  // }
  // Return funds for authorized users, optionally filtered by LDA
  const records = await prisma.fund.findMany({
    where: ldaId ? {
      localDevelopmentAgencies: {
        some: {
          id: ldaId
        }
      }
    } : undefined,
    include: {
      fundingStatus: true,
      focusAreas: true,
      locations: true,
      funders: true,
      localDevelopmentAgencies: {
        select: {
          id: true
        }
      }
    },
  });

  return NextResponse.json(records);
}
