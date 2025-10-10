import { NextRequest, NextResponse } from "next/server"
import imagekit from "@/lib/imagekit"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { DocumentUploadType } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let whereClause = {};

  // Permission check: Superuser, admin and PO can view all documents
  // LDA user can only view documents for their specific LDAs
  if (permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)) {
    // These roles can view all documents - no additional where clause needed
  } else if (permissions.isLDAUser(user)) {
    // LDA users can only view documents for their LDAs
    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }
    
    whereClause = {
      localDevelopmentAgencyId: {
        in: user.ldaIds
      }
    };
  } else {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const records = await prisma.document.findMany({
    where: whereClause,
    include: {
      localDevelopmentAgency: {
        include: {
          focusAreas: true,
          developmentStage: true
        }
      }
    }
  })
  return NextResponse.json(records)
}


export async function POST(req: NextRequest) {
  // Get the current user from the session
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file") as File

  const title = form.get("title") as string
  const description = form.get("description") as string
  const validFromDate = form.get("validFromDate") as string
  const validUntilDate = form.get("validUntilDate") as string
  const uploadedBy = form.get("uploadedBy") as DocumentUploadType
  const localDevelopmentAgencyId = parseInt(form.get("localDevelopmentAgencyId") as string)

  // TODO: Implement permission check based on uploadedBy value and user role
  // Permission check based on uploadedBy value and user role
  // if (uploadedBy === 'Funder' || uploadedBy === 'Fund') {
  //   // Only superuser can create documents with uploadedBy as Funder or Fund
  //   if (!permissions.isSuperUser(user)) {
  //     return NextResponse.json({ error: "Only superuser can create Funder/Fund documents" }, { status: 403 });
  //   }
  // } else if (uploadedBy === 'SCAT') {
  //   // Only superuser, admin, and PO can create SCAT documents
  //   if (!permissions.isSuperUser(user) && !permissions.isAdmin(user) && !permissions.isProgrammeOfficer(user)) {
  //     return NextResponse.json({ error: "Permission denied to create SCAT documents" }, { status: 403 });
  //   }
  // } else if (uploadedBy === 'LDA') {
  //   // All authenticated users can create LDA documents, but check LDA access
  //   if (!user.ldaIds || user.ldaIds.length === 0) {
  //     return NextResponse.json({ error: "No LDA access" }, { status: 403 });
  //   }
    
  //   // Check if user has access to the specified LDA
  //   if (!permissions.isSuperUser(user) && !user.ldaIds.includes(localDevelopmentAgencyId)) {
  //     return NextResponse.json({ error: "Access denied to this LDA" }, { status: 403 });
  //   }
  // } else {
  //   return NextResponse.json({ error: "Invalid uploadedBy value" }, { status: 400 });
  // }




  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileBase64 = fileBuffer.toString("base64")
  const fileName = file.name

  const uploadResponse = await imagekit.upload({
    file: fileBase64,
    fileName: fileName,
  })

  const data = {
    title: title,
    description: description,
    localDevelopmentAgency: { connect: { id: localDevelopmentAgencyId } },
    filePath: uploadResponse.filePath,
    validFromDate: validFromDate,
    validUntilDate: validUntilDate,
    uploadedBy: uploadedBy,
    createdBy: { connect: { id: parseInt(user.id as string) } }
  }
  if (!data.uploadedBy) {
    data.uploadedBy = permissions.isLDAUser(user) ? 'LDA' : 'SCAT'
  }
  const record = await prisma.document.create({
    data: data,
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record);
}
