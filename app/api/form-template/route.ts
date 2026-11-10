import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { revalidateTag } from "next/cache"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { formCategoryIdError, templateTypeForCategory } from "@/lib/form-category"

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
      category: true,
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
    const settingsError = await formCategoryIdError(data.formCategoryId);
    if (settingsError) {
      return NextResponse.json({ error: settingsError }, { status: 400 });
    }
    
    // A template in a category gets its type from it (report categories hold reports)
    const templateType = await templateTypeForCategory(data.formCategoryId)
    const query = {
      data: { ...data, ...(templateType && { templateType }) }
    };
    
    const record = await prisma.formTemplate.create(query);
    revalidateTag('form-templates:list');
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to create form template:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}