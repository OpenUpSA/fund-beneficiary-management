import { Prisma } from "@prisma/client"

export type FunderFull = Prisma.FunderGetPayload<{
  include: {
    fundingStatus: true,
    locations: true,
    focusAreas: true,
    organisationDetail: true
    contacts: true
  }
}>

export type FundFull = Prisma.FundGetPayload<{
  include: {
    fundingStatus: true,
    locations: true,
    focusAreas: true,
    funderId: true,
    funder: true,
    localDevelopmentAgencies: true,
    organisationDetail: true
    contacts: true
  }
}>

export type LocalDevelopmentAgencyFull = Prisma.LocalDevelopmentAgencyGetPayload<{
  include: {
    funds: {
      include: {
        funder: true
      }
    },
    fundingStatus: true,
    location: true,
    focusAreas: true,
    funders: true,
    developmentStage: true,
    programmeOfficer: true,
    organisationDetail: true,
    contacts: true,
    media: {
      include: {
        localDevelopmentAgency: {
          include: {
            focusAreas: true,
            developmentStage: true
          }
        }
      }
    }
    documents: {
      include: {
        localDevelopmentAgency: {
          include: {
            focusAreas: true,
            developmentStage: true
          }
        }
      }
    }
  }
}>

export type FormTemplateWithRelations = Prisma.FormTemplateGetPayload<{
  include: {
    localDevelopmentAgencyForms: {
      include: {
        localDevelopmentAgency: true
      }
    }
  }
}>

export type LocalDevelopmentAgencyFormWithRelations = Prisma.LocalDevelopmentAgencyFormGetPayload<{
  include: {
    localDevelopmentAgency: true
  }
}>

export type MediaFull = Prisma.MediaGetPayload<{
  include: {
    localDevelopmentAgency: {
      include: {
        focusAreas: true,
        developmentStage: true
      }
    }
  }
}>

export type DocumentFull = Prisma.DocumentGetPayload<{
  include: {
    localDevelopmentAgency: {
      include: {
        focusAreas: true,
        developmentStage: true
      }
    }
  }
}>