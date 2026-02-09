import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { Prisma, Gender } from "@prisma/client"
import { Form } from "@/types/forms"
import { Section } from "@/types/forms"
import { Field } from "@/types/forms"

import { NEXT_AUTH_OPTIONS } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { permissions } from "@/lib/permissions";


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

const getPrefillData = (organisation: OrganisationWithDetails, prefill: {source: string; path: string}, linkedFormData?: Record<string, unknown> | null) => {
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

    if (organisation && sections) {
      sections.forEach((section: Section) => {
        if (section.fields) {
          section.fields.forEach((field: Field) => {
            if (field?.prefill) {
              const prefill = field?.prefill as { source: string; path: string }
              // Handle prefill based on the source
              const value = getPrefillData(organisation, prefill, linkedFormData)
              if (value && !(field.name in formData)) {
                formData[field.name] = value
              }
            }
            if (field.fields) {
              field.fields.forEach((subfield: Field) => {
                if (subfield?.prefill) {
                  const subprefill = subfield?.prefill as { source: string; path: string }
                  const subvalue = getPrefillData(organisation, subprefill, linkedFormData);
                  if (subvalue && !(field.name + '_' + subfield.name in formData)) {
                    formData[field.name + '_' + subfield.name] = subvalue
                  }
                }
              })
            }
          })
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
      select: { localDevelopmentAgencyId: true }
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
    
    // Prepare update data
    const updateData: {
      formStatusId?: number;
      amount?: number;
      fundingStart?: Date;
      fundingEnd?: Date;
      approved?: Date;
      submitted?: Date;
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
        updateData.approved = undefined;
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
      // Check if a linked form already exists for this form
      const existingLinkedForm = await prisma.localDevelopmentAgencyForm.findFirst({
        where: { linkedFormId: ldaFormId }
      });

      if (data.formStatusLabel === "Approved") {
        if (!existingLinkedForm) {
          // Get Draft status for the new form
          const draftStatus = await prisma.formStatus.findFirst({
            where: { label: "Draft" }
          });

          if (draftStatus) {
            // Create the linked form (e.g., Report form linked to Application)
            const linkedForm = await prisma.localDevelopmentAgencyForm.create({
              data: {
                localDevelopmentAgencyId: updatedRecord.localDevelopmentAgencyId,
                formTemplateId: updatedRecord.formTemplate.linkedFormTemplateId,
                formStatusId: draftStatus.id,
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
        } else {
          // Linked form exists, move it to Draft
          const draftStatus = await prisma.formStatus.findFirst({
            where: { label: "Draft" }
          });

          if (draftStatus) {
            await prisma.localDevelopmentAgencyForm.update({
              where: { id: existingLinkedForm.id },
              data: { formStatusId: draftStatus.id }
            });
          }
        }
      } else if (data.formStatusLabel === "Rejected" && existingLinkedForm) {
        // Move linked form to Rejected
        const rejectedStatus = await prisma.formStatus.findFirst({
          where: { label: "Rejected" }
        });

        if (rejectedStatus) {
          await prisma.localDevelopmentAgencyForm.update({
            where: { id: existingLinkedForm.id },
            data: { formStatusId: rejectedStatus.id }
          });
        }
      } else if (existingLinkedForm) {
        // Move linked form to Paused
        const pausedStatus = await prisma.formStatus.findFirst({
          where: { label: "Paused" }
        });

        if (pausedStatus) {
          await prisma.localDevelopmentAgencyForm.update({
            where: { id: existingLinkedForm.id },
            data: { formStatusId: pausedStatus.id }
          });
        }
      }
    }
    
    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error updating LDA form field:", error);
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}