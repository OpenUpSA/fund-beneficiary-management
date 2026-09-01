import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_SOURCE_TYPE = "Uploaded";

export async function GET() {
  try {
    // The "Uploaded" source type is preselected for manual uploads in the media
    // form, so guarantee it exists.
    const uploaded = await prisma.mediaSourceType.findFirst({
      where: { title: DEFAULT_SOURCE_TYPE },
    });
    if (!uploaded) {
      await prisma.mediaSourceType.create({ data: { title: DEFAULT_SOURCE_TYPE } });
    }

    const mediaSourceTypes = await prisma.mediaSourceType.findMany({
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json(mediaSourceTypes);
  } catch (error) {
    console.error("Error fetching media source types:", error);
    return NextResponse.json(
      { error: "Failed to fetch media source types" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  try {
    const data = await req.json()
    if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const record = await prisma.mediaSourceType.create({
      data: { title: data.title.trim() }
    })
    revalidateTag('media-source-types:list')
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error creating media source type:', error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
