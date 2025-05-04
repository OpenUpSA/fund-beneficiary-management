import { NextRequest, NextResponse } from "next/server"
import imagekit from "@/lib/imagekit"
import prisma from "@/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const records = await prisma.document.findMany({
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
  const form = await req.formData()
  const file = form.get("file") as File

  const title = form.get("title") as string
  const description = form.get("description") as string
  const validFromDate = form.get("validFromDate") as string
  const validUntilDate = form.get("validUntilDate") as string
  const localDevelopmentAgencyId = parseInt(form.get("localDevelopmentAgencyId") as string)

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
    validUntilDate: validUntilDate
  }

  const record = await prisma.document.create({
    data: data,
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json(record);
}
