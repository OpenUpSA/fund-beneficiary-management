import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import imagekit from "@/lib/imagekit"
import { FileObject } from "imagekit/dist/libs/interfaces"
import { DocumentUploadType } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const getFileNameFromPath = (filePath: string): string => {
  return filePath.split("/").pop() || filePath;
}

export async function GET(req: NextRequest, { params }: { params: { document_id: string } }) {
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

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { document_id: string } }) {
  const documentId = parseInt(params.document_id, 10)
  const form = await req.formData()

  const title = form.get("title") as string
  const description = form.get("description") as string
  const validFromDate = form.get("validFromDate") as string
  const validUntilDate = form.get("validUntilDate") as string
  const localDevelopmentAgencyId = parseInt(form.get("localDevelopmentAgencyId") as string)
  const uploadedBy = form.get("uploadedBy") as DocumentUploadType

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
