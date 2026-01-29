import { NextRequest, NextResponse } from "next/server"
import imagekit from "@/lib/imagekit"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { DocumentUploadType } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Get query parameters for filtering
  const { searchParams } = new URL(req.url);
  const ldaId = searchParams.get("ldaId");
  const ldaFormId = searchParams.get("ldaFormId");
  const fundId = searchParams.get("fundId");
  const funderId = searchParams.get("funderId");

  // If no filter is passed, return empty
  if (!ldaId && !ldaFormId && !fundId && !funderId) {
    return NextResponse.json([]);
  }

  const isLDAUser = permissions.isLDAUser(user);

  // Permission checks for LDA users
  if (isLDAUser) {
    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }

    // Check if LDA user has access to the requested entities
    if (ldaId) {
      const requestedLdaId = parseInt(ldaId);
      if (!user.ldaIds.includes(requestedLdaId)) {
        return NextResponse.json({ error: "Access denied to this LDA" }, { status: 403 });
      }
    }

    if (ldaFormId) {
      // Check if the form belongs to an LDA the user has access to
      const form = await prisma.localDevelopmentAgencyForm.findUnique({
        where: { id: parseInt(ldaFormId) },
        select: { localDevelopmentAgencyId: true }
      });
      
      if (!form || !user.ldaIds.includes(form.localDevelopmentAgencyId)) {
        return NextResponse.json({ error: "Access denied to this LDA form" }, { status: 403 });
      }
    }

    // LDA users cannot access fund or funder documents
    if (fundId || funderId) {
      return NextResponse.json({ error: "Access denied to fund/funder documents" }, { status: 403 });
    }
  }

  // Build where clause with AND logic - all provided filters must match
  const whereClause: {
    localDevelopmentAgencyId?: number;
    localDevelopmentAgencyFormId?: number;
    fundId?: number;
    funderId?: number;
  } = {};
  
  if (ldaId) {
    whereClause.localDevelopmentAgencyId = parseInt(ldaId);
  }
  if (ldaFormId) {
    whereClause.localDevelopmentAgencyFormId = parseInt(ldaFormId);
  }
  if (fundId) {
    whereClause.fundId = parseInt(fundId);
  }
  if (funderId) {
    whereClause.funderId = parseInt(funderId);
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

  // Get entity IDs from form data
  const ldaIdStr = form.get("ldaId") as string
  const ldaFormIdStr = form.get("ldaFormId") as string
  const fundIdStr = form.get("fundId") as string
  const funderIdStr = form.get("funderId") as string

  const ldaId = ldaIdStr ? parseInt(ldaIdStr) : null
  const ldaFormId = ldaFormIdStr ? parseInt(ldaFormIdStr) : null
  const fundId = fundIdStr ? parseInt(fundIdStr) : null
  const funderId = funderIdStr ? parseInt(funderIdStr) : null

  // Validate that at least one entity link is provided
  if (!ldaId && !ldaFormId && !fundId && !funderId) {
    return NextResponse.json({ error: "At least one entity link (ldaId, ldaFormId, fundId, funderId) is required" }, { status: 400 })
  }

  const isLDAUser = permissions.isLDAUser(user);
  const hasFullAccess = permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user);

  // Permission checks
  if (isLDAUser) {
    // LDA users cannot add documents to Fund or Funder
    if (fundId || funderId) {
      return NextResponse.json({ error: "Permission denied: LDA users cannot add documents to funds or funders" }, { status: 403 });
    }

    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }

    // Check LDA access
    if (ldaId && !user.ldaIds.includes(ldaId)) {
      return NextResponse.json({ error: "Access denied to this LDA" }, { status: 403 });
    }

    // Check LDA Form access
    if (ldaFormId) {
      const form = await prisma.localDevelopmentAgencyForm.findUnique({
        where: { id: ldaFormId },
        select: { localDevelopmentAgencyId: true }
      });
      
      if (!form || !user.ldaIds.includes(form.localDevelopmentAgencyId)) {
        return NextResponse.json({ error: "Access denied to this LDA form" }, { status: 403 });
      }
    }
  } else if (!hasFullAccess) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // Upload file to ImageKit
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileBase64 = fileBuffer.toString("base64")
  const fileName = file.name

  const uploadResponse = await imagekit.upload({
    file: fileBase64,
    fileName: fileName,
  })

  // Build document data with appropriate entity links
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    title: title,
    description: description,
    filePath: uploadResponse.filePath,
    uploadedBy: uploadedBy,
    createdBy: { connect: { id: parseInt(user.id as string) } }
  }

  // Add dates only if provided
  if (validFromDate) {
    data.validFromDate = validFromDate
  }
  if (validUntilDate) {
    data.validUntilDate = validUntilDate
  }

  // Add entity connections
  if (ldaId) {
    data.localDevelopmentAgency = { connect: { id: ldaId } }
  }
  if (ldaFormId) {
    data.localDevelopmentAgencyForm = { connect: { id: ldaFormId } }
  }
  if (fundId) {
    data.fund = { connect: { id: fundId } }
  }
  if (funderId) {
    data.funder = { connect: { id: funderId } }
  }

  // Set default uploadedBy if not provided
  if (!data.uploadedBy) {
    data.uploadedBy = isLDAUser ? 'LDA' : 'SCAT'
  }

  const record = await prisma.document.create({
    data: data,
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record);
}
