import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import prisma from "@/db";

export async function PUT(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ldaFormId = parseInt(params.lda_form_id, 10);
    await req.json(); // Read request body but not using it
    
    // Find the form status ID for "UnderReview"
    const underReviewStatus = await prisma.formStatus.findFirst({
      where: { label: "UnderReview" }
    });
    
    if (!underReviewStatus) {
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
    console.error("Error submitting form:", error);
    return NextResponse.json({ error: "Failed to submit form" }, { status: 500 });
  }
}