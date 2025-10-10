import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { permissions } from "@/lib/permissions";

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Get all LDA forms first
  const allRecords = await prisma.localDevelopmentAgencyForm.findMany({
    include: {
      localDevelopmentAgency: true,
      formTemplate: true,
      formStatus: true
    },
  });

  // Filter records based on canViewLDA permission
  const filteredRecords = allRecords.filter(record => 
    permissions.canViewLDA(user, record.localDevelopmentAgencyId)
  );

  return NextResponse.json(filteredRecords);
}

export async function POST(req: NextRequest) {
  try {
    
    const data = await req.json()
    
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate that localDevelopmentAgencyId is provided
    if (!data.localDevelopmentAgencyId) {
      return NextResponse.json({ error: "Local Development Agency ID is required" }, { status: 400 })
    }

    const ldaId = parseInt(data.localDevelopmentAgencyId, 10);
    if (isNaN(ldaId)) {
      return NextResponse.json({ error: "Invalid LDA ID" }, { status: 400 })
    }

    // Permission check: Can view LDA
    if (!permissions.canViewLDA(session.user, ldaId) && !permissions.isSuperUser(session.user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get the form template to use its name as the title
    const formTemplate = await prisma.formTemplate.findUnique({
      where: { id: data.formTemplateId },
    })

    if (!formTemplate) {
      return NextResponse.json({ error: "Form template not found" }, { status: 404 })
    }

    // Find the "pending" form status
    const pendingStatus = await prisma.formStatus.findFirst({
      where: { label: "Draft" },
    })

    if (!pendingStatus) {
      return NextResponse.json({ error: "Pending status not found" }, { status: 404 })
    }

    const query = {
      data: {
        ...data,
        title: formTemplate.name,
        formStatusId: pendingStatus.id,
        createdById: session.user.id,
      },
    }
    const record = await prisma.localDevelopmentAgencyForm.create(query)

    return NextResponse.json(record)
  } catch (error) {
    console.error("Error creating LDA form:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}