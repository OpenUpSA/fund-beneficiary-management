import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { Prisma } from "@prisma/client"
import { Form } from "@/types/forms"
import { Section } from "@/types/forms"
import { Field } from "@/types/forms"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"


// Define a type for the organisation object with index signature to allow dynamic property access
type OrganisationWithDetails = {
  [key: string]: unknown;
  organisationDetail?: { [key: string]: unknown } | null;
  operations?: { [key: string]: unknown } | null;
};

const getPrefillData = (organisation: OrganisationWithDetails, prefill: {source: string; path: string}) => {
  switch (prefill.source) {
    case 'organisation':
      // Direct properties of the organisation
      if (['name', 'about', 'registrationCode', 'registrationDate', 'registrationStatus', 'organisationStatus', 'totalFundingRounds', 'amount', 'fundingStart', 'fundingEnd', 'developmentStageId', 'fundingStatusId', 'locationId', 'programmeOfficerId', 'organisationDetailId', 'developmentStage', 'fundingStatus', 'location', 'programmeOfficer', 'LocalDevelopmentAgencyForm', 'funds', 'focusAreas', 'contacts', 'media', 'documents', 'registrationStatus', 'operations', 'staffMembers', 'userAccess'].includes(prefill.path)) {
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
  }
  
}

export async function GET(req: NextRequest, { params }: { params: { lda_form_id: string } }) {
  const ldaFormId = parseInt(params.lda_form_id, 10)

  const record = await prisma.localDevelopmentAgencyForm.findUnique({
    where: { id: ldaFormId },
    include: {
      localDevelopmentAgency: {
        include: {
          organisationDetail: true,
          operations: true,
        },
      },
      formTemplate: true,
      formStatus: true
    },
  })

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Check if the form is not submitted and needs prefilling
  if (record.formTemplate?.form) {
    // Initialize formData if it doesn't exist
    const formData = record.formData as Prisma.JsonObject || {}
    const formTemplate = record.formTemplate.form as unknown as Form
    const organisation = record.localDevelopmentAgency
    
    // Now you can safely access formTemplate.sections
    const sections = formTemplate.sections

    if (organisation && sections) {
      sections.forEach((section: Section) => {
        if (section.fields) {
          section.fields.forEach((field: Field) => {
            if (field?.prefill) {
              const prefill = field?.prefill as { source: string; path: string }
              // Handle prefill based on the source
              const value = getPrefillData(organisation, prefill)
              if (value) {
                formData[field.name] = value
              }
            }
            if (field.fields) {
              field.fields.forEach((subfield: Field) => {
                if (subfield?.prefill) {
                  const subprefill = subfield?.prefill as { source: string; path: string }
                  const subvalue = getPrefillData(organisation, subprefill);
                  if (subvalue) {
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
  const ldaFormId = parseInt(params.lda_form_id, 10)

  try {
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
    const ldaFormId = Number(params.lda_form_id)
    const deletedLDAForm = await prisma.localDevelopmentAgencyForm.delete({
      where: { id: ldaFormId }
    })
    return NextResponse.json(deletedLDAForm)
  } catch {
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 })
  }
}
