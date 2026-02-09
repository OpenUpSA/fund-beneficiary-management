import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import prisma from "@/db";
import { permissions } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lda_form_id: string }> }) {
  try {
    // Check authentication
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lda_form_id } = await params;
    const ldaFormId = parseInt(lda_form_id, 10);
    await req.json(); // Read request body but not using it
    
    // First, get the form to check LDA access
    const existingForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: { localDevelopmentAgencyId: true }
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Permission check: Only LDA users can submit forms
    if (!permissions.isLDAUser(session.user)) {
      return NextResponse.json({ error: "Permission denied - only LDA users can submit forms" }, { status: 403 });
    }

    // Additional check: LDA user must have access to this specific LDA
    if (!permissions.canViewLDA(session.user, existingForm.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Permission denied - no access to this LDA" }, { status: 403 });
    }
    
    // Find the form status ID for "UnderReview"
    const underReviewStatus = await prisma.formStatus.findFirst({
      where: { label: "UnderReview" }
    });
    
    if (!underReviewStatus) {
      console.log("Form status 'UnderReview' not found");
      return NextResponse.json({ error: "Form status 'UnderReview' not found" }, { status: 500 });
    }
    
    // Update the form: mark as submitted and change status to "UnderReview"
    const updatedForm = await prisma.localDevelopmentAgencyForm.update({
      where: { id: ldaFormId },
      data: {
        submitted: new Date(),
        formStatusId: underReviewStatus.id
      },
      include: {
        formStatus: true
      }
    });
    
    return NextResponse.json(updatedForm);
  } catch (error) {
    console.log("Error submitting form:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error submitting form:", { message: errorMessage, stack: errorStack, error });
    return NextResponse.json({ error: "Failed to submit form", details: errorMessage }, { status: 500 });
  }
}