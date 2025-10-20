import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { fund_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only Admin and Superuser can see funds and funders
  if (!permissions.isSuperUser(user) && !permissions.isAdmin(user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const fundId = parseInt(params.fund_id, 10)

  const record = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      fundingStatus: true,
      locations: true,
      focusAreas: true,
      funders: true,
      localDevelopmentAgencies: true,
      organisationDetail: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}
