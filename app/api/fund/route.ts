import { NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

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

  // Permission logic based on user role
  if (permissions.isSuperUser(user) || permissions.isAdmin(user)) {
    // Superuser and Admin can view all funds
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
  } else if (permissions.isProgrammeOfficer(user)) {
    // Programme Officer can view funds only if ldaId is passed
    if (!ldaId) {
      return NextResponse.json({ error: "Permission denied - Programme Officer must specify an LDA ID" }, { status: 403 });
    }

    const records = await prisma.fund.findMany({
      where: {
        localDevelopmentAgencies: {
          some: {
            id: ldaId
          }
        }
      },
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
  } else if (permissions.isLDAUser(user)) {
    // LDA User can view funds only if ldaId is passed and they have access to that LDA
    if (!ldaId) {
      return NextResponse.json({ error: "Permission denied - LDA User must specify an LDA ID" }, { status: 403 });
    }

    // Check if LDA User has access to the specified LDA
    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied - no access to this LDA" }, { status: 403 });
    }

    const records = await prisma.fund.findMany({
      where: {
        localDevelopmentAgencies: {
          some: {
            id: ldaId
          }
        }
      },
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
  } else {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }
}
