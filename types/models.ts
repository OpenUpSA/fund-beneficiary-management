import { Prisma } from "@prisma/client"

export type UserFull = Prisma.UserGetPayload<{
  include: {
    localDevelopmentAgencies: true
  }
}>

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
    funders: true,
    localDevelopmentAgencies: true,
    organisationDetail: true
    contacts: true
  }
}>

export type LocalDevelopmentAgencyFull = Prisma.LocalDevelopmentAgencyGetPayload<{
  include: {
    funds: {
      include: {
        funders: true
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
    operations: true,
    userAccess: true,
    staffMembers: true,
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

export type LocalDevelopmentAgencyFormFull = Prisma.LocalDevelopmentAgencyFormGetPayload<{
  include: {
    localDevelopmentAgency: {
      include: {
        focusAreas: true,
        developmentStage: true
      }
    }
    formStatus: true
    formTemplate: true
  }
}>

export type Province = Prisma.ProvinceGetPayload<{
  include: {
    name: true,
    code: true,
    districts: true
  }
}>
    