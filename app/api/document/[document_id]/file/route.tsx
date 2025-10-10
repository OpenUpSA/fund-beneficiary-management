import prisma from "@/db"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

const imagekitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!

export async function GET(req: NextRequest, { params }: { params: { document_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const documentId = parseInt(params.document_id, 10)

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      localDevelopmentAgency: true
    },
  })

  if (!document) {
    return NextResponse.json({ error: "Missing document" }, { status: 404 })
  }

  // Permission check: Superuser, admin and PO can download any document
  // LDA user can only download documents for their specific LDAs
  if (permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)) {
    // These roles can download any document
  } else if (permissions.isLDAUser(user)) {
    // LDA users can only download documents for their LDAs
    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }
    
    if (!document.localDevelopmentAgencyId || !user.ldaIds.includes(document.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Access denied to this document" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const fileUrl = imagekitUrlEndpoint + document.filePath
  const filename = document.filePath.split("/").pop() ?? "downloaded-file"

  try {
    const response = await fetch(fileUrl)

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
    }

    const blob = await response.arrayBuffer()

    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": `attachment filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
