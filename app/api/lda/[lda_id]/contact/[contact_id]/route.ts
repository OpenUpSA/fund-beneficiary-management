import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_id: string, contact_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ldaId = parseInt(params.lda_id, 10);
  const contactId = parseInt(params.contact_id, 10);
  
  if (isNaN(ldaId) || isNaN(contactId)) {
    return NextResponse.json({ error: "Invalid LDA ID or Contact ID" }, { status: 400 });
  }

  // Permission check: Can view LDA
  if (!permissions.canViewLDA(user, ldaId)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const record = await prisma.contact.findFirst({
    where: { 
      id: contactId,
      localDevelopmentAgencyId: ldaId 
    },
    include: {
      localDevelopmentAgency: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!record) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PUT(req: NextRequest, { params }: { params: { lda_id: string, contact_id: string } }) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id, 10);
    const contactId = parseInt(params.contact_id, 10);
    
    if (isNaN(ldaId) || isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid LDA ID or Contact ID" }, { status: 400 });
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // First check if the contact exists and belongs to this LDA
    const existingContact = await prisma.contact.findFirst({
      where: { 
        id: contactId,
        localDevelopmentAgencyId: ldaId 
      }
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const data = await req.json();
    
    // Ensure the LDA ID cannot be changed through this endpoint
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { localDevelopmentAgencyId, ...updateData } = data;
    
    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        localDevelopmentAgency: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update contact:", error);
    return NextResponse.json({ error: "Failed to update contact", detail: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { lda_id: string, contact_id: string } }) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaId = parseInt(params.lda_id, 10);
    const contactId = parseInt(params.contact_id, 10);
    
    if (isNaN(ldaId) || isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid LDA ID or Contact ID" }, { status: 400 });
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(user, ldaId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // First check if the contact exists and belongs to this LDA
    const existingContact = await prisma.contact.findFirst({
      where: { 
        id: contactId,
        localDevelopmentAgencyId: ldaId 
      }
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.contact.delete({
      where: { id: contactId }
    });

    return NextResponse.json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return NextResponse.json({ error: "Failed to delete contact", detail: (error as Error).message }, { status: 500 });
  }
}
