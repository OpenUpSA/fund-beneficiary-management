import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { Gender } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

// Helper function to validate LDA ID
function validateLdaId(ldaId: number) {
  if (isNaN(ldaId)) {
    return { valid: false, response: NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 }) };
  }
  return { valid: true };
}

// GET all staff members for a specific LDA
export async function GET(
  request: NextRequest,
  { params }: { params: { lda_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const searchParams = request.nextUrl.searchParams;
    const isCommitteeParam = searchParams.get('is_committee');

    if (isNaN(ldaId)) {
      return NextResponse.json(
        { error: "Invalid LDA ID" },
        { status: 400 }
      );
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Build the where clause based on query parameters
    const whereClause: {
      localDevelopmentAgencyId: number;
      isCommittee?: boolean;
    } = {
      localDevelopmentAgencyId: ldaId,
    };

    // Add isCommittee filter if provided
    if (isCommitteeParam !== null) {
      // Convert string 'true'/'false' to boolean
      const isCommittee = isCommitteeParam.toLowerCase() === 'true';
      whereClause.isCommittee = isCommittee;
    }

    const staffMembers = await prisma.staffMember.findMany({
      where: whereClause,
    });

    return NextResponse.json(staffMembers);
  } catch (error) {
    console.error("Error fetching staff members:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff members" },
      { status: 500 }
    );
  }
}

// POST to add a new staff member
export async function POST(
  request: NextRequest,
  { params }: { params: { lda_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const validation = validateLdaId(ldaId);
    if (!validation.valid) {
      return validation.response;
    }

    // Permission check: Can manage LDA
    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

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
    
    if (!body.gender) {
      return NextResponse.json(
        { error: "Gender is required" },
        { status: 400 }
      );
    }
    
    if (!body.position || body.position === undefined || body.position === null) {
      return NextResponse.json(
        { error: "Position is required (can be empty string)" },
        { status: 400 }
      );
    }

    // Check if LDA exists
    const lda = await prisma.localDevelopmentAgency.findUnique({
      where: { id: ldaId },
    });

    if (!lda) {
      return NextResponse.json(
        { error: "LDA not found" },
        { status: 404 }
      );
    }
    // Create new staff member
    const staffMember = await prisma.staffMember.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender as Gender,
        position: body.position,
        isCommittee: body.isCommittee || false,
        localDevelopmentAgency: { connect: { id: ldaId } },
      },
    });

    return NextResponse.json(staffMember, { status: 201 });
  } catch (error) {
    console.error("Error creating staff member:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}

// PUT to update a staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: { lda_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const validation = validateLdaId(ldaId);
    if (!validation.valid) {
      return validation.response;
    }

    // Permission check: Can manage LDA
    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { error: "Staff member ID is required" },
        { status: 400 }
      );
    }
    
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
    
    if (!body.gender) {
      return NextResponse.json(
        { error: "Gender is required" },
        { status: 400 }
      );
    }
    
    if (!body.position || body.position === undefined || body.position === null) {
      return NextResponse.json(
        { error: "Position is required (can be empty string)" },
        { status: 400 }
      );
    }

    // Check if staff member exists and belongs to the specified LDA
    const existingStaff = await prisma.staffMember.findFirst({
      where: {
        id: body.id,
        localDevelopmentAgencyId: ldaId
      }
    });
    
    if (!existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found or does not belong to this LDA" },
        { status: 404 }
      );
    }

    // Update staff member
    const updatedStaff = await prisma.staffMember.update({
      where: { id: body.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender as Gender,
        position: body.position,
        isCommittee: body.isCommittee || false,
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
  { params }: { params: { lda_id: string } }
) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id);
    const { searchParams } = new URL(request.url);
    const staffIdParam = searchParams.get('staff_id');
    
    if (!staffIdParam) {
      return NextResponse.json(
        { error: "Staff ID is required as query parameter" },
        { status: 400 }
      );
    }
    
    const staffId = parseInt(staffIdParam);
    
    // Validate IDs
    const ldaValidation = validateLdaId(ldaId);
    if (!ldaValidation.valid) {
      return ldaValidation.response;
    }

    // Permission check: Can manage LDA
    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    
    if (isNaN(staffId)) {
      return NextResponse.json(
        { error: "Invalid Staff ID" },
        { status: 400 }
      );
    }
    
    // Check if staff member exists and belongs to the specified LDA
    const staffMember = await prisma.staffMember.findFirst({
      where: {
        id: staffId,
        localDevelopmentAgencyId: ldaId
      }
    });
    
    if (!staffMember) {
      return NextResponse.json(
        { error: "Staff member not found or does not belong to this LDA" },
        { status: 404 }
      );
    }
    
    // Delete the staff member
    await prisma.staffMember.delete({
      where: { id: staffId }
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
