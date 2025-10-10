import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import imagekit from "@/lib/imagekit"
import { FileObject } from "imagekit/dist/libs/interfaces"
import { DocumentUploadType } from "@prisma/client"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const getFileNameFromPath = (filePath: string): string => {
  return filePath.split("/").pop() || filePath;
}

export async function GET(req: NextRequest, { params }: { params: { document_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const documentId = parseInt(params.document_id, 10)

  const record = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      localDevelopmentAgency: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Permission check: Superuser, admin and PO can view any document
  // LDA user can only view documents for their specific LDAs
  if (permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)) {
    // These roles can view any document
  } else if (permissions.isLDAUser(user)) {
    // LDA users can only view documents for their LDAs
    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }
    
    if (!record.localDevelopmentAgencyId || !user.ldaIds.includes(record.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Access denied to this document" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { document_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const documentId = parseInt(params.document_id, 10)

  // First fetch the existing document to check permissions
  const existingDocument = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      localDevelopmentAgency: true
    },
  });

  if (!existingDocument) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const form = await req.formData()

  const title = form.get("title") as string
  const description = form.get("description") as string
  const validFromDate = form.get("validFromDate") as string
  const validUntilDate = form.get("validUntilDate") as string
  const localDevelopmentAgencyId = parseInt(form.get("localDevelopmentAgencyId") as string)
  const uploadedBy = form.get("uploadedBy") as DocumentUploadType

  // Permission check: Superuser can edit all documents
  // Other users can only edit documents they have GET access to and that match their uploadedBy permissions
  if (permissions.isSuperUser(user)) {
    // Superuser can edit any document with any uploadedBy value
  } else {
    // Check GET permissions first - can user view this document?
    if (permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)) {
      // Admin/PO can view any document, but check uploadedBy permissions for editing
    } else if (permissions.isLDAUser(user)) {
      // LDA users can only edit documents for their LDAs
      if (!user.ldaIds || user.ldaIds.length === 0) {
        return NextResponse.json({ error: "No LDA access" }, { status: 403 });
      }
      
      if (!existingDocument.localDevelopmentAgencyId || !user.ldaIds.includes(existingDocument.localDevelopmentAgencyId)) {
        return NextResponse.json({ error: "Access denied to this document" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Check uploadedBy permissions based on user role
    if (uploadedBy === 'Funder' || uploadedBy === 'Fund') {
      // Only superuser can edit to Funder/Fund (already handled above)
      return NextResponse.json({ error: "Only superuser can edit Funder/Fund documents" }, { status: 403 });
    } else if (uploadedBy === 'SCAT') {
      // Only superuser, admin, and PO can edit to SCAT
      if (!permissions.isAdmin(user) && !permissions.isProgrammeOfficer(user)) {
        return NextResponse.json({ error: "Permission denied to edit SCAT documents" }, { status: 403 });
      }
    } else if (uploadedBy === 'LDA') {
      // All users can edit to LDA, but check LDA access
      if (!user.ldaIds || user.ldaIds.length === 0) {
        return NextResponse.json({ error: "No LDA access" }, { status: 403 });
      }
      
      // Check if user has access to the target LDA
      if (!user.ldaIds.includes(localDevelopmentAgencyId)) {
        return NextResponse.json({ error: "Access denied to target LDA" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Invalid uploadedBy value" }, { status: 400 });
    }
  }

  const file = form.get("file") as File | null

  let filePath: string | undefined

  if (file && file.size > 0) {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileBase64 = fileBuffer.toString("base64")
    const fileName = file.name

    const uploadResponse = await imagekit.upload({
      file: fileBase64,
      fileName: fileName,
    })

    filePath = uploadResponse.filePath
  }

  const data: {
    title: string
    description: string
    validFromDate: string
    validUntilDate: string
    localDevelopmentAgency: { connect: { id: number } }
    filePath?: string,
    uploadedBy: DocumentUploadType
  } = {
    title,
    description,
    validFromDate,
    validUntilDate,
    localDevelopmentAgency: { connect: { id: localDevelopmentAgencyId } },
    uploadedBy,
  }

  if (filePath) {
    data.filePath = filePath
  }

  const record = await prisma.document.update({
    where: { id: documentId },
    data,
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function DELETE(req: NextRequest, { params }: { params: { document_id: string } }) {
  try {
    const documentId = Number(params.document_id)

    // Delete file from imageKit
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (document) {

      const listResults = await imagekit.listFiles({
        searchQuery: `name="${getFileNameFromPath(document.filePath)}"`,
      })

      const fileResults = listResults.filter((file): file is FileObject => 'filePath' in file)

      const matchingFile = fileResults.find((file) => file.filePath === document.filePath)


      if (matchingFile) {
        await imagekit.deleteFile(matchingFile.fileId)
      }
    }

    // Delete from database
    const deletedDocument = await prisma.document.delete({
      where: { id: documentId }
    })

    return NextResponse.json(deletedDocument)
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
