import { DocumentFull, FormTemplateWithRelations, FunderFull, FundFull, LocalDevelopmentAgencyFormFull, LocalDevelopmentAgencyFull, MediaFull } from "@/types/models"
import { FocusArea, FundingStatus, Location, DevelopmentStage, FormTemplate, User, FormStatus } from "@prisma/client"

export async function fetchFunders() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder`, { next: { tags: ['funders'] } })
  return res.json()
}

export async function fetchFunder(funder_id: string): Promise<FunderFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}`, { next: { tags: ['funders'] } })
  return res.json()
}

export async function fetchFunderFunds(funder_id: string): Promise<FundFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/fund`, { next: { tags: ['funders'] } })
  return res.json()
}

export async function fetchFunderFund(funder_id: string, fund_id: string): Promise<FundFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/fund/${fund_id}`, { next: { tags: ['funds'] } })
  return res.json()
}

export async function fetchFunds(): Promise<FundFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/fund`, { next: { tags: ['funds'] } })
  return res.json()
}

export async function fetchFundingStatuses(): Promise<FundingStatus[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funding-status`)
  return res.json()
}

export async function fetchDevelopmentStages(): Promise<DevelopmentStage[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/development-stage`)
  return res.json()
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/location`)
  return res.json()
}

export async function fetchFocusAreas(): Promise<FocusArea[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/focus-area`)
  return res.json()
}

export async function fetchLocalDevelopmentAgencies(): Promise<LocalDevelopmentAgencyFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchLocalDevelopmentAgency(lda_id: string): Promise<LocalDevelopmentAgencyFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda/${lda_id}`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user`)
  return res.json()
}

export async function fetchUser(user_id: string): Promise<User> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/${user_id}`)
  return res.json()
}

export async function fetchFormTemplate(form_template_id: string): Promise<FormTemplate> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/form-template/${form_template_id}`)
  return res.json()
}

export async function fetchFormTemplates(): Promise<FormTemplateWithRelations[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/form-template`)
  return res.json()
}

export async function fetchMedia(media_id: string): Promise<MediaFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/${media_id}`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchAllMedia(): Promise<MediaFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchDocument(document_id: string): Promise<DocumentFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/${document_id}`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchAllDocuments(): Promise<DocumentFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchAllLocalDevelopmentAgencyForms(): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda-form/`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchLocalDevelopmentAgencyFormsForLDA(lda_id: string): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda/${lda_id}/lda-form`, { next: { tags: ['ldas'] } })
  return res.json()
}

export async function fetchFormStatuses(): Promise<FormStatus[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/form-status`)
  return res.json()
}

export async function fetchLDAForm(lda_form_id: string): Promise<LocalDevelopmentAgencyFormFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda-form/${lda_form_id}`)
  return res.json()
}
