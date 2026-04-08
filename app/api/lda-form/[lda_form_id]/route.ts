import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { Prisma, Gender } from "@prisma/client"
import { Form } from "@/types/forms"

import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { permissions } from "@/lib/permissions";
import { triggerFormEvent } from "@/lib/form-events";


export const dynamic = "force-dynamic"
export const runtime = "nodejs"


// Define a type for the staff member structure
type StaffMember = {
  firstName: string;
  lastName: string;
  gender: Gender; // Use the Gender enum from Prisma
  position?: string | null; // Allow null values for position
  isCommittee: boolean;
  // Add other potential properties from the database
  id?: number;
  localDevelopmentAgencyId?: number;
};

// Define a type for the organisation object with index signature to allow dynamic property access
type OrganisationWithDetails = {
  organisationDetail?: { [key: string]: unknown } | null;
  operations?: { [key: string]: unknown } | null;
  staffMembers: StaffMember[];
};

// Context needed for funding-related prefill sources
type FundingContext = {
  ldaId: number;
  fundingStart: Date;
  fundingEnd: Date;
};

const getPrefillData = async (
  organisation: OrganisationWithDetails, 
  prefill: {source: string; path: string}, 
  linkedFormData?: Record<string, unknown> | null,
  fundingContext?: FundingContext
) => {
  switch (prefill.source) {
    case 'organisation':
      // Direct properties of the organisation
      if (organisation && prefill.path) {
        const value = organisation[prefill.path as keyof typeof organisation]
        if (value !== undefined && value !== null) {
          return String(value)
        }
      }
      break;
      
    case 'organisation_detail':
      // Properties from the related organisationDetail
      if (organisation.organisationDetail && prefill.path) {
        const detailValue = organisation.organisationDetail[prefill.path as keyof typeof organisation.organisationDetail]
        if (detailValue !== undefined && detailValue !== null) {
          return String(detailValue)
        }
      }
      break;
      
    case 'organisation_operations':
      // Properties from the related operations
      if (organisation.operations && prefill.path) {
        const operationsValue = organisation.operations[prefill.path as keyof typeof organisation.operations]
        if (operationsValue !== undefined && operationsValue !== null) {
          return String(operationsValue)
        }
      }
      break;

    case 'organisation_staff':
      // Properties from the related staff
      if (prefill.path) {
        if (prefill.path === 'organisation_staff_members') {
          return organisation.staffMembers.filter((staffMember) => staffMember.isCommittee === false).map((staffMember) => ({
            name: staffMember.firstName + ' ' + staffMember.lastName,
            gender: staffMember.gender,
            position: staffMember.position
          }))
        } else if (prefill.path === 'organisation_board_members') {
          return organisation.staffMembers.filter((staffMember) => staffMember.isCommittee === true).map((staffMember) => ({
            name: staffMember.firstName + ' ' + staffMember.lastName,
            gender: staffMember.gender
          }))
        }
      }
      break;

    case 'linkedForm':
      // Properties from the linked form's formData
      if (linkedFormData && prefill.path) {
        const linkedValue = linkedFormData[prefill.path]
        if (linkedValue !== undefined && linkedValue !== null) {
          return linkedValue
        }
      }
      break;

    case 'defaultValue':
      if (prefill.path) {
        return prefill.path
      }
      break;

    case 'core_grant_funding': {
      // Find approved grant funding form where finance report's start date is within the grant period
      // Amount is divided by 4 (quarterly)
      if (!fundingContext) break;
      const grantForm = await prisma.localDevelopmentAgencyForm.findFirst({
        where: {
          localDevelopmentAgencyId: fundingContext.ldaId,
          approved: { not: null },
          formTemplate: { formCategory: 'grant_funding' },
          fundingStart: { lte: fundingContext.fundingStart },
          fundingEnd: { gte: fundingContext.fundingStart },
        },
        orderBy: { approved: 'desc' },
        select: { amount: true },
      });
      if (grantForm?.amount) {
        const quarterlyAmount = Number(grantForm.amount) / 4;
        return String(quarterlyAmount);
      }
      return "0";
    }

    case 'fris_funding': {
      // Sum FRIS claim amounts where status is Approved and approval date is between report's funding period
      if (!fundingContext) break;
      const frisClaims = await prisma.localDevelopmentAgencyForm.findMany({
        where: {
          localDevelopmentAgencyId: fundingContext.ldaId,
          formStatus: { label: 'Approved' },
          formTemplate: { formCategory: 'fris_claim' },
          approved: {
            gte: fundingContext.fundingStart,
            lte: fundingContext.fundingEnd,
          },
        },
        select: { amount: true },
      });
      const totalFris = frisClaims.reduce((sum, claim) => sum + Number(claim.amount), 0);
      return String(totalFris);
    }

    case 'dft_funding': {
      // Sum DFT application amounts where status is Approved and approval date is between report's funding period
      if (!fundingContext) break;
      const dftApps = await prisma.localDevelopmentAgencyForm.findMany({
        where: {
          localDevelopmentAgencyId: fundingContext.ldaId,
          formStatus: { label: 'Approved' },
          formTemplate: { formCategory: 'dft_application' },
          approved: {
            gte: fundingContext.fundingStart,
            lte: fundingContext.fundingEnd,
          },
        },
        select: { amount: true },
      });
      const totalDft = dftApps.reduce((sum, app) => sum + Number(app.amount), 0);
      return String(totalDft);
    }
  }
  
}

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

  // Check if the form is not submitted and needs prefilling
  if (record.formTemplate?.form) {
    // Initialize formData if it doesn't exist
    const formData = record.formData as Prisma.JsonObject || {}
    const formTemplate = record.formTemplate.form as unknown as Form
    const organisation = record.localDevelopmentAgency
    const linkedFormData = record.linkedForm?.formData as Record<string, unknown> | null
    
    // Now you can safely access formTemplate.sections
    const sections = formTemplate.sections

    // Build funding context for funding-related prefill sources
    const fundingContext: FundingContext = {
      ldaId: record.localDevelopmentAgencyId,
      fundingStart: record.fundingStart,
      fundingEnd: record.fundingEnd,
    };

    if (organisation && sections) {
      // Collect all prefill tasks first, then run in parallel
      const prefillTasks: Array<{ key: string; promise: Promise<unknown> }> = []

      for (const section of sections) {
        if (section.fields) {
          for (const field of section.fields) {
            if (field?.prefill && !(field.name in formData)) {
              const prefill = field.prefill as { source: string; path: string }
              prefillTasks.push({ key: field.name, promise: getPrefillData(organisation, prefill, linkedFormData, fundingContext) })
            }
            if (field.fields) {
              for (const subfield of field.fields) {
                if (subfield?.prefill) {
                  const key = field.name + '_' + subfield.name
                  if (!(key in formData)) {
                    const subprefill = subfield.prefill as { source: string; path: string }
                    prefillTasks.push({ key, promise: getPrefillData(organisation, subprefill, linkedFormData, fundingContext) })
                  }
                }
              }
            }
          }
        }
      }

      const results = await Promise.all(prefillTasks.map(t => t.promise))
      results.forEach((value, i) => {
        if (value !== undefined && value !== null) {
          formData[prefillTasks[i].key] = value as Prisma.JsonValue
        }
      })
    }
    record.formData = formData as Prisma.JsonValue
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
    // First check if the form exists and get its LDA ID
    const existingForm = await prisma.localDevelopmentAgencyForm.findUnique({
      where: { id: ldaFormId },
      select: { localDevelopmentAgencyId: true }
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
            form: true
          }
        }
      }
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (
      !permissions.canViewLDA(user, existingForm.localDevelopmentAgencyId)
      || permissions.isLDAUser(user)
    ) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const data = await req.json();

    // Validate admin feedback sections are complete before allowing Approved/Rejected status
    if (data.formStatusLabel === "Approved" || data.formStatusLabel === "Rejected") {
      const formTemplate = existingForm.formTemplate?.form as { sections?: Array<{ admin_feedback?: boolean; fields: Array<{ name: string; required?: boolean }> }> } | null;
      const formData = existingForm.formData as Record<string, unknown> | null;
      
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
    
    // Prepare update data
    const updateData: {
      formStatusId?: number;
      amount?: number;
      fundingStart?: Date;
      fundingEnd?: Date;
      approved?: Date | null;
      submitted?: Date | null;
    } = {};
    
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

      // Trigger form event asynchronously (don't await to avoid blocking)
      if (data.formStatusLabel === "Approved") {
        // Get the full form record for the event trigger
        prisma.localDevelopmentAgencyForm.findUnique({
          where: { id: ldaFormId }
        }).then(fullForm => {
          if (fullForm) {
            triggerFormEvent(
              'approved',
              fullForm,
              user?.id ? parseInt(user.id, 10) : undefined
            ).catch(err => console.error('Form event trigger error:', err))
          }
        })
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
            linkedFormTemplate: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Handle linked form based on status changes
    if (updatedRecord.formTemplate?.linkedFormTemplateId) {
      // Fetch existingLinkedForm and target status in parallel
      const targetStatusLabel = data.formStatusLabel === "Approved" ? "Draft"
        : data.formStatusLabel === "Rejected" ? "Rejected"
        : "Paused"

      const [existingLinkedForm, targetStatus] = await Promise.all([
        prisma.localDevelopmentAgencyForm.findFirst({ where: { linkedFormId: ldaFormId } }),
        prisma.formStatus.findFirst({ where: { label: targetStatusLabel } }),
      ])

      if (data.formStatusLabel === "Approved") {
        if (!existingLinkedForm) {
          if (targetStatus) {
            // Create the linked form (e.g., Report form linked to Application)
            const linkedForm = await prisma.localDevelopmentAgencyForm.create({
              data: {
                localDevelopmentAgencyId: updatedRecord.localDevelopmentAgencyId,
                formTemplateId: updatedRecord.formTemplate.linkedFormTemplateId,
                formStatusId: targetStatus.id,
                formData: {},
                title: `${updatedRecord.formTemplate.linkedFormTemplate?.name || 'Linked Form'} - ${new Date().getFullYear()}`,
                linkedFormId: ldaFormId,
                dueDate: updatedRecord.dueDate,
                fundingStart: updatedRecord.fundingStart,
                fundingEnd: updatedRecord.fundingEnd,
              }
            });

            return NextResponse.json({ ...updatedRecord, createdLinkedForm: linkedForm });
          }
        } else if (targetStatus) {
          // Linked form exists, move it to Draft
          await prisma.localDevelopmentAgencyForm.update({
            where: { id: existingLinkedForm.id },
            data: { formStatusId: targetStatus.id }
          });
        }
      } else if (existingLinkedForm && targetStatus) {
        // Move linked form to Rejected or Paused
        await prisma.localDevelopmentAgencyForm.update({
          where: { id: existingLinkedForm.id },
          data: { formStatusId: targetStatus.id }
        });
      }
    }
    
    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error updating LDA form field:", error);
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}