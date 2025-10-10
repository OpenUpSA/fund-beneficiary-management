import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import imagekit from "@/lib/imagekit"
import { FileObject } from "imagekit/dist/libs/interfaces"
import { MediaType } from "@prisma/client"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const getFileNameFromPath = (filePath: string): string => {
  return filePath.split("/").pop() || filePath;
}

export async function GET(req: NextRequest, { params }: { params: { media_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const mediaId = parseInt(params.media_id, 10)

  const record = await prisma.media.findUnique({
    where: { id: mediaId },
    include: {
      localDevelopmentAgency: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Permission check: Can view LDA (only users with access to this LDA can view the media)
  if (!permissions.canViewLDA(user, record.localDevelopmentAgencyId)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { media_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const mediaId = parseInt(params.media_id, 10)

  // First, get the existing media to check ownership
  const existingMedia = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { 
      createdById: true,
      localDevelopmentAgencyId: true
    }
  });

  if (!existingMedia) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Permission check: Only the creator or superuser can edit
  const isCreator = existingMedia.createdById === parseInt(user.id);
  const isSuperuser = permissions.isSuperUser(user);

  if (!isCreator && !isSuperuser) {
    return NextResponse.json({ error: "Permission denied - only the creator or superuser can edit this media" }, { status: 403 });
  }

  const form = await req.formData()

  const title = form.get("title") as string
  const description = form.get("description") as string
  const localDevelopmentAgencyId = parseInt(form.get("localDevelopmentAgencyId") as string)
  const mediaSourceTypeId = parseInt(form.get("mediaSourceTypeId") as string)
  const mediaType = form.get("mediaType") as MediaType

  // Additional check: If changing LDA, ensure user has access to the new LDA
  if (localDevelopmentAgencyId !== existingMedia.localDevelopmentAgencyId) {
    if (!permissions.canViewLDA(user, localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Permission denied - no access to the specified LDA" }, { status: 403 });
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
    localDevelopmentAgency: { connect: { id: number } }
    mediaSourceType: { connect: { id: number } }
    mediaType: MediaType
    filePath?: string
  } = {
    title,
    description,
    localDevelopmentAgency: { connect: { id: localDevelopmentAgencyId } },
    mediaSourceType: { connect: { id: mediaSourceTypeId } },
    mediaType,
  }

  if (filePath) {
    data.filePath = filePath
  }

  const record = await prisma.media.update({
    where: { id: mediaId },
    data,
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record)
}

export async function DELETE(req: NextRequest, { params }: { params: { media_id: string } }) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Permission check: Only superuser can delete media
    if (!permissions.isSuperUser(user)) {
      return NextResponse.json({ error: "Permission denied - only superuser can delete media" }, { status: 403 });
    }

    const mediaId = Number(params.media_id)

    // Delete file from imageKit
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    })

    if (media) {

      const listResults = await imagekit.listFiles({
        searchQuery: `name="${getFileNameFromPath(media.filePath)}"`,
      })

      const fileResults = listResults.filter((file): file is FileObject => 'filePath' in file)

      const matchingFile = fileResults.find((file) => file.filePath === media.filePath)


      if (matchingFile) {
        await imagekit.deleteFile(matchingFile.fileId)
      }
    }

    // Delete from database
    const deletedMedia = await prisma.media.delete({
      where: { id: mediaId }
    })

    return NextResponse.json(deletedMedia)
  } catch {
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 })
  }
}
