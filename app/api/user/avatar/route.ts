import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import imagekit from "@/lib/imagekit"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Upload an avatar image for the currently signed-in user.
// Stores the ImageKit filePath on User.avatar and returns the updated user.
export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileBase64 = fileBuffer.toString("base64")

    const uploadResponse = await imagekit().upload({
      file: fileBase64,
      fileName: file.name,
      folder: "/avatars",
    })

    const updated = await prisma.user.update({
      where: { id: parseInt(session.user.id as string) },
      data: { avatar: uploadResponse.filePath },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
