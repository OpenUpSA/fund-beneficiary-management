import prisma from "@/db"
import { NextRequest, NextResponse } from "next/server"

const imagekitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!

export async function GET(req: NextRequest, { params }: { params: { media_id: string } }) {
  const mediaId = parseInt(params.media_id, 10)

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: {
      localDevelopmentAgency: true
    },
  })

  if (!media) {
    return NextResponse.json({ error: "Missing media" }, { status: 400 })
  }

  const fileUrl = imagekitUrlEndpoint + media.filePath
  const filename = media.filePath.split("/").pop() ?? "downloaded-file"

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
