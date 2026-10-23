import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { Prisma } from "@prisma/client"

import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { permissions, canReadForm, canFillForm, canApproveForm } from "@/lib/permissions";
import { triggerFormEvent } from "@/lib/form-events";
import {
  validateFormSubmission,
  type FormTemplateInput,
} from "@/lib/form-validation/validate-submission";
import { applyPrefill } from "@/lib/lda-form-prefill";
import { buildPlaceholderValues, substituteTemplatePlaceholders } from "@/lib/template-placeholders";
import { revalidateTag } from "next/cache";
import { ensureLinkedForm, isLinkedFormTrigger, setLinkedFormStatus } from "@/lib/linked-form";


export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ldaFormId = parseInt(params.lda_form_id, 10)

  const record = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: ldaFormId },
    include: {
      localDevelopmentAgency: {
        include: {
          organisationDetail: true,
          operations: true,
          staffMembers: true,
        },
      },
      formTemplate: true,
      formStatus: true,
      createdBy: true,
      linkedForm: true,
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Permission check: Can view LDA
  if (!permissions.canViewLDA(user, record.localDevelopmentAgencyId)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // Permission check: template must grant this user's role read access
  if (!canReadForm(user, record.formTemplate.readRoles)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // Apply prefill for display only — prefill is persisted to DB on approval, not here
  if (record.formTemplate?.form) {
    const savedFormData = (record.formData as Record<string, unknown>) ?? {}
    const { mergedData } = await applyPrefill(ldaFormId, savedFormData)
    record.formData = mergedData as Prisma.JsonValue

    // Resolve {{period_start}}/{{period_end}}/{{year}} placeholders in the
    // template text against this form's reporting period. Everything
    // downstream (renderer, preview/PDF, response CSV) consumes this payload.
    record.formTemplate.form = substituteTemplatePlaceholders(
      record.formTemplate.form,
      buildPlaceholderValues(record)
    )
  }

  return NextResponse.json(record)
}

export async function PUT(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null;
  
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ldaFormId = parseInt(params.lda_form_id, 10)

  try {
    // First check if the form exists and get its LDA ID + fill permissions
    const existingForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: {
        localDevelopmentAgencyId: true,
        formTemplate: { select: { fillRoles: true, approveRoles: true } }
      }
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Permission check: Can view LDA
    if (
      !permissions.canViewLDA(user, existingForm.localDevelopmentAgencyId)
      || permissions.isLDAUser(user)
    ) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const data = await req.json()

    // Changing submission state counts as submitting — only roles allowed to fill may do so
    if (data.submitted !== undefined && !canFillForm(user, existingForm.formTemplate?.fillRoles)) {
      return NextResponse.json({ error: "Permission denied - your role cannot submit this form" }, { status: 403 });
    }

    // Changing approval state counts as approving — only roles allowed to approve may do so
    if (data.approved !== undefined && !canApproveForm(user, existingForm.formTemplate?.approveRoles)) {
      return NextResponse.json({ error: "Permission denied - your role cannot approve this form" }, { status: 403 });
    }

    const updated = await prisma.localDevelopmentAgencyForm.update({
      where: { id: ldaFormId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.submitted !== undefined && { submitted: data.submitted }),
        ...(data.dueDate && { dueDate: data.dueDate }),
        ...(data.approved !== undefined && { approved: data.approved }),
        ...(data.formData && { formData: data.formData }),
        ...(data.formStatusId && {
          formStatus: {
            connect: { id: data.formStatusId },
          },
        }),
      }
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    const user = session?.user || null;
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaFormId = Number(params.lda_form_id)
    
    // First check if the form exists and get its LDA ID
    const existingForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: { localDevelopmentAgencyId: true }
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Permission check: Can view LDA
    if (!permissions.isSuperUser(user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const deletedLDAForm = await prisma.localDevelopmentAgencyForm.delete({
      where: { id: ldaFormId }
    })
    return NextResponse.json(deletedLDAForm)
  } catch (error) {
    console.error("Failed to delete form:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(NEXT_AUTH_OPTIONS);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session?.user || null;
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ldaFormId = parseInt(params.lda_form_id, 10);

    const existingForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: {
        localDevelopmentAgencyId: true,
        formData: true,
        formTemplate: {
          select: {
            form: true,
            approveRoles: true
          }
        }
      }
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (!permissions.canViewLDA(user, existingForm.localDevelopmentAgencyId)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Permission check: template must grant this user's role approve access
    // (this PATCH drives status changes — including Approved/Rejected — amount and dates)
    if (!canApproveForm(user, existingForm.formTemplate?.approveRoles)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const data = await req.json();

    // Prefills shown by GET may not be stored yet. Resolve the same values
    // before validation, then persist them with a successful approval.
    let formDataForValidation = (existingForm.formData ?? {}) as Record<string, unknown>;
    let approvalPrefills: Record<string, Prisma.JsonValue> = {};
    if (data.formStatusLabel === "Approved") {
      const { mergedData, newPrefills } = await applyPrefill(ldaFormId, formDataForValidation);
      formDataForValidation = mergedData;
      approvalPrefills = newPrefills;
    }

    // Validate admin feedback sections are complete before allowing Approved/Rejected status
    if (data.formStatusLabel === "Approved" || data.formStatusLabel === "Rejected") {
      const formTemplate = existingForm.formTemplate?.form as { sections?: Array<{ admin_feedback?: boolean; fields: Array<{ name: string; required?: boolean }> }> } | null;
      const formData = formDataForValidation;
      
      if (formTemplate?.sections) {
        const adminFeedbackSections = formTemplate.sections.filter(section => section.admin_feedback);
        
        for (const section of adminFeedbackSections) {
          for (const field of section.fields) {
            if (field.required) {
              const value = formData?.[field.name];
              if (!value || (typeof value === 'string' && value.trim() === '')) {
                return NextResponse.json({ 
                  error: "Please complete all required fields in the admin feedback section before setting status to Approved or Rejected" 
                }, { status: 400 });
              }
            }
          }
        }
      }
    }

    // Validate form data completeness before allowing Approved status
    if (data.formStatusLabel === "Approved") {
      const template = (existingForm.formTemplate?.form ?? null) as FormTemplateInput | null;
      const issues = validateFormSubmission(template, formDataForValidation, user.role);

      if (issues.length > 0) {
        return NextResponse.json(
          {
            error: "Form data is incomplete. Cannot approve a form with missing required fields.",
            issues,
          },
          { status: 400 }
        );
      }
    }
    
    // Prepare update data
    const updateData: {
      formStatusId?: number;
      amount?: number;
      fundingStart?: Date;
      fundingEnd?: Date;
      approved?: Date | null;
      submitted?: Date | null;
      formData?: Prisma.InputJsonObject;
    } = {};

    if (Object.keys(approvalPrefills).length > 0) {
      updateData.formData = formDataForValidation as Prisma.InputJsonObject;
    }
    
    // Process form status (needs to map from label to ID)
    if (data.formStatusLabel) {
      // Find the form status ID by label
      const formStatus = await prisma.formStatus.findFirst({
        where: { label: data.formStatusLabel }
      });
      
      if (formStatus) {
        updateData.formStatusId = formStatus.id;
      }

      if (data.formStatusLabel === "Approved") {
        updateData.approved = new Date();
      } else {
        updateData.approved = null;
      }

      if (data.formStatusLabel === "Draft") {
        updateData.submitted = undefined;
      }
    }
    
    // Process other fields
    if (data.amount !== undefined) {
      // Clean amount string and convert to number
      const amountStr = data.amount.toString().replace(/[^0-9.]/g, '');
      updateData.amount = parseFloat(amountStr);
    }
    
    if (data.fundingStart) {
      updateData.fundingStart = new Date(data.fundingStart);
    }
    
    if (data.fundingEnd) {
      updateData.fundingEnd = new Date(data.fundingEnd);
    }
    
    // Only proceed if there's data to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
    }
    
    // Update the record
    const updatedRecord = await prisma.localDevelopmentAgencyForm.update({
      where: { id: ldaFormId },
      data: updateData,
      select: {
        id: true,
        formStatusId: true,
        amount: true,
        fundingStart: true,
        fundingEnd: true,
        localDevelopmentAgencyId: true,
        formTemplateId: true,
        formData: true,
        dueDate: true,
        formStatus: {
          select: {
            id: true,
            label: true
          }
        },
        formTemplate: {
          select: {
            linkedFormTemplateId: true,
            linkedFormTriggerStatusId: true
          }
        }
      }
    });

    // Only dispatch approval events after the status and prefills are saved.
    if (data.formStatusLabel === "Approved") {
      prisma.localDevelopmentAgencyForm.findUnique({
        where: { id: ldaFormId }
      }).then(fullForm => {
        if (fullForm) {
          return triggerFormEvent(
            'approved',
            fullForm,
            user?.id ? parseInt(user.id, 10) : undefined
          );
        }
      }).catch(err => console.error('Form event trigger error:', err));
    }

    if (data.fundingStart || data.fundingEnd) {
      revalidateTag('lda-forms:list')
    }

    // Handle the linked form (e.g. Report for an Application) — only on status
    // changes, so editing the amount or dates leaves it alone
    if (data.formStatusLabel && updatedRecord.formTemplate?.linkedFormTemplateId) {
      if (isLinkedFormTrigger(updatedRecord.formTemplate, updatedRecord.formStatus)) {
        const linkedForm = await ensureLinkedForm(ldaFormId);
        if (linkedForm) {
          return NextResponse.json({ ...updatedRecord, createdLinkedForm: linkedForm });
        }
      } else {
        await setLinkedFormStatus(ldaFormId, data.formStatusLabel === "Rejected" ? "Rejected" : "Paused");
      }
    }
    
    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error updating LDA form field:", error);
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}
