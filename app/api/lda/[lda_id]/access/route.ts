import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { AccessLevel } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Helper function to validate lda_id
const validateLdaId = async (ldaId: number) => {
  if (isNaN(ldaId)) {
    return { valid: false, error: "Invalid LDA ID" };
  }

  const lda = await prisma.localDevelopmentAgency.findUnique({
    where: { id: ldaId },
  });

  if (!lda) {
    return { valid: false, error: "Local Development Agency not found" };
  }

  return { valid: true, lda };
};

// GET all user access for an LDA
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
    
    const validation = await validateLdaId(ldaId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.error === "Invalid LDA ID" ? 400 : 404 }
      );
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const userAccess = await prisma.userAccess.findMany({
      where: {
        localDevelopmentAgencyId: ldaId,
      },
    });

    return NextResponse.json(userAccess);
  } catch (error) {
    console.error("Error fetching user access:", error);
    return NextResponse.json(
      { error: "Failed to fetch user access" },
      { status: 500 }
    );
  }
}

// POST to create a new user access
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
    
    const validation = await validateLdaId(ldaId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.error === "Invalid LDA ID" ? 400 : 404 }
      );
    }

    // Permission check: Can manage LDA
    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

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

    // Create the user access
    const userAccess = await prisma.userAccess.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        accessLevel: body.accessLevel as AccessLevel,
        localDevelopmentAgency: { connect: { id: ldaId } },
      },
    });

    return NextResponse.json(userAccess);
  } catch (error) {
    console.error("Error creating user access:", error);
    return NextResponse.json(
      { error: "Failed to create user access" },
      { status: 500 }
    );
  }
}
