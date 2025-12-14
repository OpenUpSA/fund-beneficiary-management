import prisma from "@/db"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

const imagekitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!

export async function GET(req: NextRequest, { params }: { params: { media_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

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

  // Permission check
  // If media has an LDA, check if user can view that LDA
  // If media has no LDA (fund/funder media), only staff can download
  const isLDAUser = permissions.isLDAUser(user)
  
  if (media.localDevelopmentAgencyId) {
    // Media linked to LDA - check LDA permissions
    if (!permissions.canViewLDA(user, media.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
  } else {
    // Media linked to fund/funder - only staff can download
    if (isLDAUser) {
      return NextResponse.json({ error: "Permission denied. LDA users cannot download fund/funder media." }, { status: 403 });
    }
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
