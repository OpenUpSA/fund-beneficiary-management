import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { canViewFunders } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { funder_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can see funders
  if (!canViewFunders(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const id = parseInt(params.funder_id, 10)

  // Step 1: Get all fund IDs linked to this funder
  const funder = await prisma.funder.findUnique({
    where: { id: id },
    select: {
      fundFunders: {
        select: {
          fundId: true
        }
      }
    }
  })

  if (!funder) {
    return NextResponse.json({ error: "Funder not found" }, { status: 404 })
  }

  const fundIds = funder.fundFunders.map(ff => ff.fundId)
  const fundLdas = await prisma.fundLocalDevelopmentAgency.findMany({
    where: {
      fundId: {
        in: fundIds
      }
    },
    include: {
      localDevelopmentAgency: true,
      fund: {
        select: {
          name: true,
          id: true
        }
      }
    }
  })

  return NextResponse.json(fundLdas)
}
