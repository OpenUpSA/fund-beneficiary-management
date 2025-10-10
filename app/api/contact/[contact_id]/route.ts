import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { contact_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contactId = parseInt(params.contact_id, 10);

  // First fetch the contact with its associated LDAs
  const record = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      localDevelopmentAgencies: {
        select: {
          id: true
        }
      }
    }
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Permission check: Superuser, admin and PO can view any contact
  // LDA user can view contact if user has access to the LDA
  if (permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)) {
    // These roles can view any contact
    return NextResponse.json(record);
  } else if (permissions.isLDAUser(user)) {
    // LDA users can only view contacts if they have access to at least one of the contact's LDAs
    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }
    
    const contactLdaIds = record.localDevelopmentAgencies.map(lda => lda.id);
    const hasAccess = contactLdaIds.some(ldaId => user.ldaIds!.includes(ldaId));
    
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied to this contact" }, { status: 403 });
    }
    
    return NextResponse.json(record);
  } else {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { contact_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contactId = parseInt(params.contact_id, 10);

  try {
    // First fetch the contact with its associated LDAs to check permissions
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        localDevelopmentAgencies: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Permission check: Superuser can edit any contact
    // Any user that has access to LDA can edit contact
    if (permissions.isSuperUser(user)) {
      // Superuser can edit any contact
    } else {
      // Check if user has access to at least one of the contact's LDAs
      if (!user.ldaIds || user.ldaIds.length === 0) {
        return NextResponse.json({ error: "No LDA access" }, { status: 403 });
      }
      
      const contactLdaIds = existingContact.localDevelopmentAgencies.map(lda => lda.id);
      const hasAccess = contactLdaIds.some(ldaId => user.ldaIds!.includes(ldaId));
      
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to edit this contact" }, { status: 403 });
      }
    }

    const data = await req.json();
    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update contact:", err);
    return NextResponse.json({ error: "Failed to update", detail: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { contact_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contactId = parseInt(params.contact_id, 10);

  try {
    // First fetch the contact with its associated LDAs to check permissions
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        localDevelopmentAgencies: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Permission check: Superuser can delete any contact
    // Any user that has access to LDA can delete contact
    if (permissions.isSuperUser(user)) {
      // Superuser can delete any contact
    } else {
      // Check if user has access to at least one of the contact's LDAs
      if (!user.ldaIds || user.ldaIds.length === 0) {
        return NextResponse.json({ error: "No LDA access" }, { status: 403 });
      }
      
      const contactLdaIds = existingContact.localDevelopmentAgencies.map(lda => lda.id);
      const hasAccess = contactLdaIds.some(ldaId => user.ldaIds!.includes(ldaId));
      
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to delete this contact" }, { status: 403 });
      }
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete contact:", err);
    return NextResponse.json({ error: "Failed to delete", detail: (err as Error).message }, { status: 500 });
  }
}
