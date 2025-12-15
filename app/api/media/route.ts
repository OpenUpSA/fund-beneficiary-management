import { NextRequest, NextResponse } from "next/server"
import imagekit from "@/lib/imagekit"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { MediaType } from "@prisma/client"
import { permissions } from "@/lib/permissions"

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

  const isLDAUser = permissions.isLDAUser(user);
  const isStaff = permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user);

  // If no filter is passed
  if (!ldaId && !ldaFormId && !fundId && !funderId) {
    // Staff can view all media without filters
    if (isStaff) {
      const records = await prisma.media.findMany({
        include: {
          localDevelopmentAgency: {
            include: {
              focusAreas: true,
              developmentStage: true
            }
          },
          createdBy: true,
          mediaSourceType: true,
        }
      });
      return NextResponse.json(records);
    }
    // LDA users and others must provide filters
    return NextResponse.json([]);
  }

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

    // LDA users cannot access fund or funder media
    if (fundId || funderId) {
      return NextResponse.json({ error: "Access denied to fund/funder media" }, { status: 403 });
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

  const records = await prisma.media.findMany({
    where: whereClause,
    include: {
      localDevelopmentAgency: {
        include: {
          focusAreas: true,
          developmentStage: true
        }
      },
      createdBy: true,
      mediaSourceType: true,
    }
  });
  return NextResponse.json(records);
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
  const mediaSourceTypeId = form.get("mediaSourceTypeId") as string
  const mediaType = form.get("mediaType") as MediaType

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
    // LDA users cannot add media to Fund or Funder
    if (fundId || funderId) {
      return NextResponse.json({ error: "Permission denied: LDA users cannot add media to funds or funders" }, { status: 403 });
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
      const formRecord = await prisma.localDevelopmentAgencyForm.findUnique({
        where: { id: ldaFormId },
        select: { localDevelopmentAgencyId: true }
      });
      
      if (!formRecord || !user.ldaIds.includes(formRecord.localDevelopmentAgencyId)) {
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

  // Build media data with appropriate entity links
  const data: {
    title: string;
    description: string;
    filePath: string;
    mediaType: MediaType;
    mediaSourceType?: { connect: { id: number } };
    createdBy: { connect: { id: number } };
    localDevelopmentAgency?: { connect: { id: number } };
    localDevelopmentAgencyForm?: { connect: { id: number } };
    fund?: { connect: { id: number } };
    funder?: { connect: { id: number } };
  } = {
    title: title,
    description: description,
    filePath: uploadResponse.filePath,
    mediaType: mediaType,
    createdBy: { connect: { id: parseInt(user.id as string) } }
  }

  // Add media source type if provided
  if (mediaSourceTypeId) {
    data.mediaSourceType = { connect: { id: parseInt(mediaSourceTypeId) } }
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

  const record = await prisma.media.create({
    data: data,
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record);
}
