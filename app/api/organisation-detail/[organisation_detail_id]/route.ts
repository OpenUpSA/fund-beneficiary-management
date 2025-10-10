import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { organisation_detail_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const organisationDetailId = parseInt(params.organisation_detail_id, 10)

  // First get the LDA associations for permission checking
  const ldaAssociations = await prisma.organisationDetail.findUnique({
    where: { id: organisationDetailId },
    select: {
      LocalDevelopmentAgencies: {
        select: { id: true }
      }
    }
  });

  if (!ldaAssociations) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Check if organisation detail has associated LDAs and user has access to at least one
  if (ldaAssociations.LocalDevelopmentAgencies.length === 0) {
    return NextResponse.json({ error: "No associated LDA found" }, { status: 404 });
  }

  // Permission check: Can view at least one of the associated LDAs
  const hasAccess = ldaAssociations.LocalDevelopmentAgencies.some(lda => 
    permissions.canViewLDA(user, lda.id)
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // Now get the actual record without including LDA data
  const record = await prisma.organisationDetail.findUnique({
    where: { id: organisationDetailId }
  });

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { organisation_detail_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const organisationDetailId = parseInt(params.organisation_detail_id, 10)

  try {
    // First, get the LDA associations for permission checking
    const ldaAssociations = await prisma.organisationDetail.findUnique({
      where: { id: organisationDetailId },
      select: {
        LocalDevelopmentAgencies: {
          select: { id: true }
        }
      }
    });

    if (!ldaAssociations) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Check if organisation detail has associated LDAs
    if (ldaAssociations.LocalDevelopmentAgencies.length === 0) {
      return NextResponse.json({ error: "No associated LDA found" }, { status: 404 });
    }

    // Permission check: Can manage at least one of the associated LDAs
    const hasManageAccess = ldaAssociations.LocalDevelopmentAgencies.some(lda => 
      permissions.canManageLDA(user, lda.id)
    );

    if (!hasManageAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const data = await req.json()

    const updated = await prisma.organisationDetail.update({
      where: { id: organisationDetailId },
      data: data
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update organisation detail:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
