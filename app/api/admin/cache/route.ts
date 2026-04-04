import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { revalidateTag } from "next/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const validTags = [
  'ldas:list',
  'funders:list',
  'funds:list',
  'templates',
  'users:list',
  'media:list',
  'documents:list',
  'funding-statuses',
  'development-stages',
  'locations',
  'focus-areas',
  'form-statuses',
  'provinces:list',
  'media-source-types:list',
]

export async function POST(req: NextRequest) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user || !permissions.isSuperUser(session.user)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 })
  }

  try {
    const data = await req.json()
    const { action, tag } = data

    if (action === 'revalidate') {
      if (!tag || !validTags.includes(tag)) {
        return NextResponse.json({ error: "Invalid cache tag" }, { status: 400 })
      }
      
      revalidateTag(tag)
      return NextResponse.json({ success: true, tag, message: `Cache "${tag}" revalidated` })
    }

    if (action === 'revalidate-all') {
      for (const t of validTags) {
        revalidateTag(t)
      }
      return NextResponse.json({ success: true, message: "All caches revalidated" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error('Error managing cache:', error)
    return NextResponse.json({ error: "Failed to manage cache" }, { status: 500 })
  }
}
