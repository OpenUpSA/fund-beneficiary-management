import { NextResponse } from "next/server"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.fund.findMany({
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
