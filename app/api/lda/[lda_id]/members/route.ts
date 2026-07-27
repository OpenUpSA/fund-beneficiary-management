import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

// GET all member users of a specific LDA
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
    if (isNaN(ldaId)) {
      return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 });
    }

    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const members = await prisma.localDevelopmentAgencyUser.findMany({
      where: { localDevelopmentAgencyId: ldaId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, approved: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching LDA members:", error);
    return NextResponse.json({ error: "Failed to fetch LDA members" }, { status: 500 });
  }
}

// POST to add a user as a member of the LDA
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
    if (isNaN(ldaId)) {
      return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 });
    }

    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const userId = parseInt(body.userId);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const [lda, targetUser] = await Promise.all([
      prisma.localDevelopmentAgency.findUnique({ where: { id: ldaId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!lda) {
      return NextResponse.json({ error: "LDA not found" }, { status: 404 });
    }
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (targetUser.role !== "USER") {
      return NextResponse.json(
        { error: "Only LDA users can be added as members" },
        { status: 400 }
      );
    }

    const member = await prisma.localDevelopmentAgencyUser.create({
      data: { userId, localDevelopmentAgencyId: ldaId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, approved: true } },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    // userId is unique: a user can belong to only one LDA
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "User is already a member of an LDA" },
        { status: 409 }
      );
    }
    console.error("Error adding LDA member:", error);
    return NextResponse.json({ error: "Failed to add LDA member" }, { status: 500 });
  }
}

// DELETE to remove a user from the LDA's members
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
    if (isNaN(ldaId)) {
      return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 });
    }

    if (!permissions.canManageLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const userIdParam = request.nextUrl.searchParams.get("user_id");
    const userId = parseInt(userIdParam ?? "");
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "user_id is required as query parameter" },
        { status: 400 }
      );
    }

    const member = await prisma.localDevelopmentAgencyUser.findFirst({
      where: { userId, localDevelopmentAgencyId: ldaId },
    });

    if (!member) {
      return NextResponse.json(
        { error: "User is not a member of this LDA" },
        { status: 404 }
      );
    }

    await prisma.localDevelopmentAgencyUser.delete({ where: { id: member.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing LDA member:", error);
    return NextResponse.json({ error: "Failed to remove LDA member" }, { status: 500 });
  }
}
