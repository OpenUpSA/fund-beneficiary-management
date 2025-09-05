import { DocumentFull, FormTemplateWithRelations, FunderFull, FundFull, LocalDevelopmentAgencyFormFull, LocalDevelopmentAgencyFull, MediaFull, UserFull, Province, UserWithLDAsBasic } from "@/types/models"
import { FocusArea, FundingStatus, Location, DevelopmentStage, FormTemplate, FormStatus, Contact, MediaSourceType } from "@prisma/client"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"

export async function fetchFunders() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder`, { next: { tags: ['funders:list'] } })
  return res.json()
}

export async function fetchFunder(funder_id: string): Promise<FunderFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}`, { next: { tags: ['funders:list', `funder:detail:${funder_id}`] } })
  return res.json()
}

export async function fetchFunderFunds(funder_id: string): Promise<FundFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/fund`, { next: { tags: [`funder:${funder_id}:funds:list`] } })
  return res.json()
}

export async function fetchFunderFund(funder_id: string, fund_id: string): Promise<FundFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/fund/${fund_id}`, { next: { tags: [`funder:${funder_id}:funds:list`, `funder:${funder_id}:fund:${fund_id}`] } })
  return res.json()
}

export async function fetchFunds(lda_id?: string): Promise<FundFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/fund`)
  const tags = ['funds:list']
  if (lda_id) {
    url.searchParams.append('ldaId', lda_id)
    tags.push(`fund:list:${lda_id}`)
  }

  const res = await fetch(url.toString(), { next: { tags } })
  return res.json()
}

export async function fetchFund(fund_id: string): Promise<FundFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/fund/${fund_id}`, { next: { tags: ['funds:list', `fund:detail:${fund_id}`] } })
  return res.json()
}

export async function fetchFundingStatuses(): Promise<FundingStatus[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funding-status`, { next: { tags: ['funding-statuses'] } })
  return res.json()
}

export async function fetchDevelopmentStages(): Promise<DevelopmentStage[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/development-stage`, { next: { tags: ['development-stages'] } })
  return res.json()
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/location`, { next: { tags: ['locations'] } })
  return res.json()
}

export async function fetchFocusAreas(): Promise<FocusArea[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/focus-area`, { next: { tags: ['focus-areas'] } })
  return res.json()
}

export async function fetchLocalDevelopmentAgencies(): Promise<LocalDevelopmentAgencyFull[]> {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda`, { next: { tags: ['ldas:list'] } })
  const ldas = await res.json()

  // If no user or role is ADMIN/PROGRAMME_OFFICER, return all LDAs
  if (!user || user.role === 'ADMIN' || user.role === 'PROGRAMME_OFFICER') {
    return ldas
  }

  // For USER role, filter by their LDA IDs
  return ldas.filter((lda: LocalDevelopmentAgencyFull) => user.ldaIds?.includes(lda.id))
}

export async function fetchLocalDevelopmentAgency(lda_id: string): Promise<LocalDevelopmentAgencyFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda/${lda_id}`, { 
    next: { tags: ['ldas:list', `lda:detail:${lda_id}`] } 
  })
  return res.json()
}

export async function fetchUsers(): Promise<UserWithLDAsBasic[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user`, { next: { tags: ['users:list'] } })
  return res.json()
}

export async function fetchUser(user_id: string): Promise<UserFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/${user_id}`, { next: { tags: ['users:list', `user:detail:${user_id}`] } })
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
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/${media_id}`, { next: { tags: ['media:list', `media:detail:${media_id}`] } })
  return res.json()
}

export async function fetchAllMedia(): Promise<MediaFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/`, { next: { tags: ['media:list'] } })
  return res.json()
}

export async function fetchLDAMedia(lda_id: string): Promise<MediaFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/`)
  url.searchParams.append('ldaId', lda_id)
  const res = await fetch(url.toString(), { next: { tags: ['media:list', `media:lda:${lda_id}`] } })
  return res.json()
}

export async function fetchDocument(document_id: string): Promise<DocumentFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/${document_id}`, { next: { tags: ['documents:list', `document:detail:${document_id}`] } })
  return res.json()
}

export async function fetchAllDocuments(): Promise<DocumentFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/`, { next: { tags: ['documents:list'] } })
  return res.json()
}

export async function fetchLDADocuments(lda_id: string): Promise<DocumentFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/`)
  url.searchParams.append('ldaId', lda_id)
  const res = await fetch(url.toString(), { next: { tags: ['documents:list', `documents:lda:${lda_id}`] } })
  return res.json()
}

export async function fetchAllLocalDevelopmentAgencyForms(): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda-form/`, { next: { tags: ['lda-forms:list'] } })
  return res.json()
}

export async function fetchLocalDevelopmentAgencyFormsForLDA(lda_id: string): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda/${lda_id}/lda-form`, { next: { tags: ['lda-forms:list', `lda-forms:lda:${lda_id}:list`] } })
  return res.json()
}

export async function fetchFormStatuses(): Promise<FormStatus[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/form-status`, { next: { tags: ['form-statuses'] } })
  return res.json()
}

export async function fetchLDAForm(lda_form_id: string): Promise<LocalDevelopmentAgencyFormFull> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda-form/${lda_form_id}`, 
    { 
      next: { tags: ['lda-forms:list', `lda-forms:detail:${lda_form_id}`] },
    }
  )
  return res.json()
}

export async function fetchProvinces(): Promise<Province[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/provinces`, { next: { tags: ['provinces:list'] } })
  const data = await res.json();
  return data;
}

export async function fetchProvince(province_code: string): Promise<Province> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/provinces/${province_code}`, { next: { tags: ['provinces:list', `provinces:detail:${province_code}`] } })
  return res.json()
}

export async function fetchContacts(lda_id?: string): Promise<Contact[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/contact`)
  
  if (lda_id) {
    url.searchParams.append('ldaId', lda_id)
  }
  
  const res = await fetch(url.toString(), { 
    next: { 
      tags: lda_id ? ['contacts:list', `contacts:lda:${lda_id}`] : ['contacts:list'] 
    } 
  })
  return res.json()
}

export async function fetchMediaSourceTypes(): Promise<MediaSourceType[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media-source-type`, { 
    next: { tags: ['media-source-types:list'] } 
  })
  return res.json()
}
