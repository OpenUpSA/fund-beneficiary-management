import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { AccessLevel } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// GET a specific user access
export async function GET(
  request: NextRequest,
  { params }: { params: { lda_id: string; access_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const accessId = parseInt(params.access_id);
    
    if (isNaN(ldaId) || isNaN(accessId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const userAccess = await prisma.userAccess.findFirst({
      where: {
        id: accessId,
        localDevelopmentAgencyId: ldaId,
      },
    });

    if (!userAccess) {
      return NextResponse.json(
        { error: "User access not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(userAccess);
  } catch (error) {
    console.error("Error fetching user access:", error);
    return NextResponse.json(
      { error: "Failed to fetch user access" },
      { status: 500 }
    );
  }
}

// PUT to update a user access
export async function PUT(
  request: NextRequest,
  { params }: { params: { lda_id: string; access_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const accessId = parseInt(params.access_id);
    
    if (isNaN(ldaId) || isNaN(accessId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Permission check: Can manage LDA
    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    
    // Check if the LDA exists
    const lda = await prisma.localDevelopmentAgency.findUnique({
      where: { id: ldaId },
    });
    
    if (!lda) {
      return NextResponse.json(
        { error: "Local Development Agency not found" },
        { status: 404 }
      );
    }
    
    // Check if the user access exists
    const existingAccess = await prisma.userAccess.findFirst({
      where: {
        id: accessId,
        localDevelopmentAgencyId: ldaId,
      },
    });
    
    if (!existingAccess) {
      return NextResponse.json(
        { error: "User access not found" },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.fullName || !body.fullName.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }
    
    if (!body.email || !body.email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!EMAIL_REGEX.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    if (!body.accessLevel || !['Admin', 'ReadOnly'].includes(body.accessLevel)) {
      return NextResponse.json(
        { error: "Valid access level is required (Admin or ReadOnly)" },
        { status: 400 }
      );
    }
    
    // Update the user access
    const updatedAccess = await prisma.userAccess.update({
      where: {
        id: accessId,
      },
      data: {
        fullName: body.fullName,
        email: body.email,
        accessLevel: body.accessLevel as AccessLevel,
      },
    });
    
    return NextResponse.json(updatedAccess);
  } catch (error) {
    console.error("Error updating user access:", error);
    return NextResponse.json(
      { error: "Failed to update user access" },
      { status: 500 }
    );
  }
}

// DELETE to remove a user access
export async function DELETE(
  request: NextRequest,
  { params }: { params: { lda_id: string; access_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const accessId = parseInt(params.access_id);
    
    if (isNaN(ldaId) || isNaN(accessId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Permission check: Can manage LDA
    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    
    // Check if the user access exists and belongs to the specified LDA
    const userAccess = await prisma.userAccess.findFirst({
      where: {
        id: accessId,
        localDevelopmentAgencyId: ldaId,
      },
    });
    
    if (!userAccess) {
      return NextResponse.json(
        { error: "User access not found" },
        { status: 404 }
      );
    }
    
    // Delete the user access
    await prisma.userAccess.delete({
      where: {
        id: accessId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user access:", error);
    return NextResponse.json(
      { error: "Failed to delete user access" },
      { status: 500 }
    );
  }
}
