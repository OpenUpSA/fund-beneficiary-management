import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { revalidateTag } from "next/cache"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { form_template_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const formTemplateId = parseInt(params.form_template_id, 10)

  const record = await prisma.formTemplate.findUnique({
    where: { id: formTemplateId },
    include: {
      localDevelopmentAgencyForms: {
        include: {
          localDevelopmentAgency: true,
        },
      },
    }
  });

  if (!record) {
    return NextResponse.json({ error: "Form template not found" }, { status: 404 });
  }

  // Any authenticated user can view form templates
  return NextResponse.json(record);
}

export async function PUT(req: NextRequest, { params }: { params: { form_template_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only superuser can edit form templates
  if (!permissions.isSuperUser(user)) {
    return NextResponse.json({ error: "Permission denied - only superuser can edit form templates" }, { status: 403 });
  }

  const id = parseInt(params.form_template_id, 10)

  try {
    // Check if template exists
    const existingTemplate = await prisma.formTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Form template not found" }, { status: 404 });
    }

    const data = await req.json()

    const updated = await prisma.formTemplate.update({
      where: { id: id },
      data: data
    })
    revalidateTag('ldas')
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update form template:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { form_template_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Permission check: Only superuser can delete form templates
  if (!permissions.isSuperUser(user)) {
    return NextResponse.json({ error: "Permission denied - only superuser can delete form templates" }, { status: 403 });
  }

  try {
    const formTemplateId = Number(params.form_template_id)
    
    // Check if template exists
    const existingTemplate = await prisma.formTemplate.findUnique({
      where: { id: formTemplateId }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Form template not found" }, { status: 404 });
    }
    
    const deletedFormTemplate = await prisma.formTemplate.delete({
      where: { id: formTemplateId }
    })
    revalidateTag('ldas')
    return NextResponse.json(deletedFormTemplate)
  } catch (error) {
    console.error("Failed to delete form template:", error);
    return NextResponse.json({ error: "Failed to delete form template" }, { status: 500 })
  }
}
