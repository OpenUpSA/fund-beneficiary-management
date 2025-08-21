import { NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url)
  const ldaIdParam = searchParams.get('ldaId')
  const ldaId = ldaIdParam ? parseInt(ldaIdParam) : undefined
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
