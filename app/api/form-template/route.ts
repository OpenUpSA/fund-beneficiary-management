import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { revalidateTag } from "next/cache"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Any authenticated user can view form templates
  const records = await prisma.formTemplate.findMany({
    include: {
      localDevelopmentAgencyForms: {
        include: {
          localDevelopmentAgency: true
        },
      },
    },
  });
  
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Permission check: Only superuser can create form templates
    if (!permissions.isSuperUser(user)) {
      return NextResponse.json({ error: "Permission denied - only superuser can create form templates" }, { status: 403 });
    }

    const data = await req.json();
    
    const query = {
      data: data
    };
    
    const record = await prisma.formTemplate.create(query);
    revalidateTag('templates');
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to create form template:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}