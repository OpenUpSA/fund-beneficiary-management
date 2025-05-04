import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import imagekit from "@/lib/imagekit"
import { FileObject } from "imagekit/dist/libs/interfaces"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const getFileNameFromPath = (filePath: string): string => {
  return filePath.split("/").pop() || filePath;
}

export async function GET(req: NextRequest, { params }: { params: { media_id: string } }) {
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

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { media_id: string } }) {
  const mediaId = parseInt(params.media_id, 10)
  const form = await req.formData()

  const title = form.get("title") as string
  const description = form.get("description") as string
  const localDevelopmentAgencyId = parseInt(form.get("localDevelopmentAgencyId") as string)

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
    filePath?: string
  } = {
    title,
    description,
    localDevelopmentAgency: { connect: { id: localDevelopmentAgencyId } },
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
