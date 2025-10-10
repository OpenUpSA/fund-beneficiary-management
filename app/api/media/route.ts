import { NextRequest, NextResponse } from "next/server"
import imagekit from "@/lib/imagekit"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { MediaType } from "@prisma/client"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Check user permissions and filter accordingly
  if (permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)) {
    // These roles can view all media
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
  } else if (permissions.isLDAUser(user)) {
    // LDA users can only view media from their LDAs
    if (!user.ldaIds || user.ldaIds.length === 0) {
      return NextResponse.json({ error: "No LDA access" }, { status: 403 });
    }
    
    const records = await prisma.media.findMany({
      where: {
        localDevelopmentAgencyId: { in: user.ldaIds }
      },
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
  } else {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }
}


export async function POST(req: NextRequest) {
  // Get the current user from the session
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file") as File

  const title = form.get("title") as string
  const description = form.get("description") as string
  const localDevelopmentAgencyId = parseInt(form.get("localDevelopmentAgencyId") as string)
  const mediaSourceTypeId = form.get("mediaSourceTypeId") as string
  const mediaType = form.get("mediaType") as MediaType

  // Validate LDA ID
  if (isNaN(localDevelopmentAgencyId)) {
    return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 })
  }

  // Permission check: Can view LDA
  if (!permissions.canViewLDA(session.user, localDevelopmentAgencyId)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

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
    mediaType: mediaType,
    mediaSourceType: { connect: { id: parseInt(mediaSourceTypeId) } },
    createdBy: { connect: { id: parseInt(session.user.id) } }
  }

  const record = await prisma.media.create({
    data: data,
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record);
}
