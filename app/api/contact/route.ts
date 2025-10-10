import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const ldaId = searchParams.get('ldaId');
  
  let query = {};
  
  // Permission check: Superuser, admin and PO can view any contact
  // LDA user can view only for their LDA
  if (permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)) {
    // These roles can view all contacts or filter by ldaId if provided
    if (ldaId) {
      const parsedLdaId = parseInt(ldaId, 10);
      if (!isNaN(parsedLdaId)) {
        query = {
          where: {
            localDevelopmentAgencies: {
              some: { id: parsedLdaId }
            }
          }
        };
      }
    }
  } else if (permissions.isLDAUser(user)) {
    // LDA users can only view contacts for their LDAs
    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }
    
    if (ldaId) {
      const parsedLdaId = parseInt(ldaId, 10);
      if (!isNaN(parsedLdaId) && user.ldaIds.includes(parsedLdaId)) {
        query = {
          where: {
            localDevelopmentAgencies: {
              some: { id: parsedLdaId }
            }
          }
        };
      } else {
        return NextResponse.json({ error: "Access denied to this LDA" }, { status: 403 });
      }
    } else {
      // Return contacts for all user's LDAs
      query = {
        where: {
          localDevelopmentAgencies: {
            some: {
              id: { in: user.ldaIds }
            }
          }
        }
      };
    }
  } else {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const records = await prisma.contact.findMany(query);
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const data = await req.json();
    
    // Validate that LDA IDs are provided
    if (!data.localDevelopmentAgencies || !Array.isArray(data.localDevelopmentAgencies) || data.localDevelopmentAgencies.length === 0) {
      return NextResponse.json({ error: "At least one LDA must be specified" }, { status: 400 });
    }
    
    const ldaIds = data.localDevelopmentAgencies.map((lda: any) => 
      typeof lda === 'object' ? lda.id : parseInt(lda, 10)
    ).filter((id: number) => !isNaN(id));
    
    if (ldaIds.length === 0) {
      return NextResponse.json({ error: "Valid LDA IDs must be provided" }, { status: 400 });
    }
    
    // Permission check: Superuser can add for any LDA
    // Any other user can only add if they have access to the LDA
    if (permissions.isSuperUser(user)) {
      // Superuser can add contacts for any LDA - no additional checks needed
    } else {
      // Check if user has access to all specified LDAs
      if (!user.ldaIds || user.ldaIds.length === 0) {
        return NextResponse.json({ error: "No LDA access" }, { status: 403 });
      }
      
      const hasAccessToAllLDAs = ldaIds.every((ldaId: number) => user.ldaIds!.includes(ldaId));
      if (!hasAccessToAllLDAs) {
        return NextResponse.json({ error: "Access denied to one or more specified LDAs" }, { status: 403 });
      }
    }
    
    const query = {
      data: {
        ...data,
        localDevelopmentAgencies: {
          connect: ldaIds.map((id: number) => ({ id }))
        }
      },
    };
    
    const record = await prisma.contact.create(query);
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to create contact:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}