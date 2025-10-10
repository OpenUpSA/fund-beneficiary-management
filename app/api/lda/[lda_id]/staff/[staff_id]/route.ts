import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { Gender } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

// GET a specific staff member
export async function GET(
  request: NextRequest,
  { params }: { params: { lda_id: string; staff_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const staffId = parseInt(params.staff_id);
    
    if (isNaN(ldaId) || isNaN(staffId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const staffMember = await prisma.staffMember.findFirst({
      where: {
        id: staffId,
        localDevelopmentAgencyId: ldaId,
      },
    });

    if (!staffMember) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(staffMember);
  } catch (error) {
    console.error("Error fetching staff member:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff member" },
      { status: 500 }
    );
  }
}

// PUT to update a staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: { lda_id: string; staff_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const staffId = parseInt(params.staff_id);
    
    if (isNaN(ldaId) || isNaN(staffId)) {
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
    
    // Check if the staff member exists
    const existingStaff = await prisma.staffMember.findFirst({
      where: {
        id: staffId,
        localDevelopmentAgencyId: ldaId,
      },
    });
    
    if (!existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.firstName || !body.firstName.trim()) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }
    
    if (!body.lastName || !body.lastName.trim()) {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      );
    }
    
    if (!body.gender || !['Male', 'Female', 'Other'].includes(body.gender)) {
      return NextResponse.json(
        { error: "Valid gender is required" },
        { status: 400 }
      );
    }
    
    if (body.position === undefined || body.position === null) {
      return NextResponse.json(
        { error: "Position is required (can be empty string)" },
        { status: 400 }
      );
    }

    // Update staff member
    const updatedStaff = await prisma.staffMember.update({
      where: { id: staffId },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender as Gender,
        position: body.position,
        isCommittee: body.isCommittee !== undefined ? body.isCommittee : existingStaff.isCommittee,
      },
    });

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("Error updating staff member:", error);
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}

// DELETE a staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { lda_id: string; staff_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const staffId = parseInt(params.staff_id);
    
    if (isNaN(ldaId) || isNaN(staffId)) {
      return NextResponse.json(
        { error: "Invalid ID parameters" },
        { status: 400 }
      );
    }

    // Permission check: Can manage LDA
    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Check if staff member exists and belongs to the specified LDA
    const existingStaff = await prisma.staffMember.findFirst({
      where: {
        id: staffId,
        localDevelopmentAgency: {
          id: ldaId,
        },
      },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Delete the staff member
    await prisma.staffMember.delete({
      where: { id: staffId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting staff member:", error);
    return NextResponse.json(
      { error: "Failed to delete staff member" },
      { status: 500 }
    );
  }
}
