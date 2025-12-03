import { DocumentFull, FormTemplateWithRelations, FunderFull, FundFull, LocalDevelopmentAgencyFormFull, LocalDevelopmentAgencyFull, MediaFull, UserFull, Province, UserWithLDAsBasic } from "@/types/models"
import { FocusArea, FundingStatus, Location, DevelopmentStage, FormTemplate, FormStatus, Contact, MediaSourceType } from "@prisma/client"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { headers } from "next/headers"
import { permissions } from "./permissions"

export async function fetchFunders() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['funders:list'] } 
  })
  return res.json()
}

export async function fetchFunder(funder_id: string): Promise<FunderFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['funders:list', `funder:detail:${funder_id}`] } 
  })
  return res.json()
}

export async function fetchFunderFunds(funder_id: string): Promise<FundFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/fund`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: [`funder:${funder_id}:funds:list`] } 
  })
  return res.json()
}

export async function fetchFunderFund(funder_id: string, fund_id: string): Promise<FundFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/fund/${fund_id}`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: [`funder:${funder_id}:funds:list`, `funder:${funder_id}:fund:${fund_id}`] } 
  })
  return res.json()
}

export async function fetchFunderLDAs(funder_id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/lda`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: [`funder:${funder_id}:ldas`] } 
  })
  return res.json()
}

export async function fetchFunderLDAForms(funder_id: string): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funder/${funder_id}/lda-form`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: [`funder-lda-forms:${funder_id}`] } 
  })
  return res.json()
}

export async function fetchFunds(lda_id?: string): Promise<FundFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/fund`)
  const tags = ['funds:list']
  if (lda_id) {
    url.searchParams.append('ldaId', lda_id)
    tags.push(`fund:list:${lda_id}`)
  }

  const res = await fetch(url.toString(), { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags } 
  })
  return res.json()
}

export async function fetchFund(fund_id: string): Promise<FundFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/fund/${fund_id}`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['funds:list', `fund:detail:${fund_id}`] } 
  })
  return res.json()
}

export async function fetchFundingStatuses(): Promise<FundingStatus[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/funding-status`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['funding-statuses'] } 
  })
  return res.json()
}

export async function fetchDevelopmentStages(): Promise<DevelopmentStage[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/development-stage`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['development-stages'] } 
  })
  return res.json()
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/location`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['locations'] } 
  })
  return res.json()
}

export async function fetchFocusAreas(): Promise<FocusArea[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/focus-area`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['focus-areas'] } 
  })
  return res.json()
}

export async function fetchLocalDevelopmentAgencies(): Promise<LocalDevelopmentAgencyFull[]> {
  const session = await getServerSession(NEXT_AUTH_OPTIONS);
  const user = session?.user || null

  const canViewAllLDAs = permissions.canViewAllLDAs(user)
  const tags = ['ldas:list']
  if (!canViewAllLDAs) {
    tags.push(`ldas:list:${user?.ldaIds?.join(':')}`)
  }

  // Forward cookies so the API route can read the session with getServerSession
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda`, {
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags }
  })
  return res.json()
}

export async function fetchLocalDevelopmentAgency(lda_id: string): Promise<LocalDevelopmentAgencyFull | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda/${lda_id}`, {
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['ldas:list', `lda:detail:${lda_id}`] } 
  })

  if (res.status === 403) {
    return null
  }

  return res.json()
}

export async function fetchUsers(): Promise<UserWithLDAsBasic[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['users:list'] } 
  })
  return res.json()
}

export async function fetchUser(user_id: string): Promise<UserFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/${user_id}`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['users:list', `user:detail:${user_id}`] } 
  })
  return res.json()
}

export async function fetchFormTemplate(form_template_id: string): Promise<FormTemplate> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/form-template/${form_template_id}`, {
    headers: {
      cookie: headers().get('cookie') ?? ''
    }
  })
  return res.json()
}

export async function fetchFormTemplates(): Promise<FormTemplateWithRelations[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/form-template`, {
    headers: {
      cookie: headers().get('cookie') ?? ''
    }
  })
  return res.json()
}

export async function fetchMedia(media_id: string): Promise<MediaFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/${media_id}`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['media:list', `media:detail:${media_id}`] } 
  })
  return res.json()
}

export async function fetchAllMedia(): Promise<MediaFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['media:list'] } 
  })
  return res.json()
}

export async function fetchLDAMedia(lda_id: string): Promise<MediaFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media/`)
  url.searchParams.append('ldaId', lda_id)
  const res = await fetch(url.toString(), { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['media:list', `media:lda:${lda_id}`] } 
  })
  return res.json()
}

export async function fetchDocument(document_id: string): Promise<DocumentFull> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/${document_id}`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['documents:list', `document:detail:${document_id}`] } 
  })
  return res.json()
}

export async function fetchAllDocuments(): Promise<DocumentFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['documents:list'] } 
  })
  return res.json()
}

export async function fetchLDADocuments(lda_id: string): Promise<DocumentFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/`)
  url.searchParams.append('ldaId', lda_id)
  const res = await fetch(url.toString(), { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['documents:list', `documents:lda:${lda_id}`] } 
  })
  return res.json()
}

export async function fetchFundDocuments(fund_id: string): Promise<DocumentFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/`)
  url.searchParams.append('fundId', fund_id)
  const res = await fetch(url.toString(), { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['documents:list', `documents:fund:${fund_id}`] } 
  })
  return res.json()
}

export async function fetchFunderDocuments(funder_id: string): Promise<DocumentFull[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/document/`)
  url.searchParams.append('funderId', funder_id)
  const res = await fetch(url.toString(), { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['documents:list', `documents:funder:${funder_id}`] } 
  })
  return res.json()
}

export async function fetchAllLocalDevelopmentAgencyForms(): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda-form/`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['lda-forms:list'] } 
  })
  return res.json()
}

export async function fetchLocalDevelopmentAgencyFormsForLDA(lda_id: string): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda/${lda_id}/lda-form`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['lda-forms:list', `lda-forms:lda:${lda_id}:list`] } 
  })
  return res.json()
}

export async function fetchFormStatuses(): Promise<FormStatus[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/form-status`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['form-statuses'] } 
  })
  return res.json()
}

export async function fetchLDAForm(lda_form_id: string): Promise<LocalDevelopmentAgencyFormFull> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda-form/${lda_form_id}`, 
    { 
      headers: {
        cookie: headers().get('cookie') ?? ''
      },
      next: { tags: ['lda-forms:list', `lda-forms:detail:${lda_form_id}`] },
    }
  )
  return res.json()
}

export async function fetchFundLDAForms(fund_id: string): Promise<LocalDevelopmentAgencyFormFull[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/fund/${fund_id}/lda-form`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['lda-forms:list', `fund-lda-forms:${fund_id}`] },
  })
  return res.json()
}

export async function fetchProvinces(): Promise<Province[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/provinces`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['provinces:list'] } 
  })
  const data = await res.json();
  return data;
}

export async function fetchProvince(province_code: string): Promise<Province> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/provinces/${province_code}`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['provinces:list', `provinces:detail:${province_code}`] } 
  })
  return res.json()
}

export async function fetchContacts(lda_id: string): Promise<Contact[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lda/${lda_id}/contact`)
  
  const res = await fetch(url.toString(), { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { 
      tags: ['contacts:list', `contacts:lda:${lda_id}`] 
    } 
  })

  if (res.status !== 200) {
    return []
  }

  return res.json()
}

export async function fetchMediaSourceTypes(): Promise<MediaSourceType[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/media-source-type`, { 
    headers: {
      cookie: headers().get('cookie') ?? ''
    },
    next: { tags: ['media-source-types:list'] } 
  })
  return res.json()
}
