import { Prisma } from "@prisma/client"

export type UserFull = Prisma.UserGetPayload<{
  include: {
    localDevelopmentAgencies: true
  }
}>

// Lightweight user type for lists: matches /api/user GET select
export type UserWithLDAsBasic = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    email: true
    role: true
    approved: true
    createdAt: true
    updatedAt: true
    localDevelopmentAgencies: {
      select: { id: true, name: true }
    }
  }
}>

export type FunderFullWithoutFundFunders = Prisma.FunderGetPayload<{
  include: {
    focusAreas: true,
    organisationDetail: true,
    fundFunders: false
  }
}>

// Base FunderFull type from Prisma
type FunderFullBase = Prisma.FunderGetPayload<{
  include: {
    focusAreas: true,
    organisationDetail: true,
    fundFunders: {
      include: {
        fund: true
      }
    }
  }
}>

export type FundWithFocusAreas = Prisma.FundGetPayload<{
  include: {
    focusAreas: true,
  }
}>

export type FunderWithFocusAreas = Prisma.FunderGetPayload<{
  include: {
    focusAreas: true
  }
}>

export type FunderFull = Prisma.FunderGetPayload<{
  include: {
    focusAreas: true,
    organisationDetail: true,
    fundFunders: {
      include: {
        fund: {
          include: {
            focusAreas: true
          }
        }
      }
    }
  }
}>

// Extended FundFull type with transformed API response properties
export type LimitedFundModel = Prisma.FundGetPayload<{
  include: {
    focusAreas: true,
    organisationDetail: true,
    fundFunders: {
      select: {
        id: true,
      }
    },
    fundLocalDevelopmentAgencies: {
      select: {
        id: true,
        fundingStatus: true
      }
    }
  }
}>

export type FundFull = Prisma.FundGetPayload<{
  include: {
    focusAreas: true,
    organisationDetail: true,
    fundFunders: {
      include: {
        funder: true
      }
    },
    fundLocalDevelopmentAgencies: {
      include: {
        localDevelopmentAgency: true,
        fund: {
          select: {
            name: true,
            id: true
          }
        }
      }
    }
  }
}>

export type LocalDevelopmentAgencyFull = Prisma.LocalDevelopmentAgencyGetPayload<{
  include: {
    fundingStatus: true,
    location: true,
    focusAreas: true,
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
    fundLocalDevelopmentAgencies: {
      include: {
        fund: {
          include: {
            focusAreas: true,
            fundFunders: {
              include: {
                funder: true
              }
            }
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
    createdBy: true
    mediaSourceType: true
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
    createdBy: true
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

export type FundForFunder = Prisma.FundFunderGetPayload<{
  include: {
    fund: {
      include: {
        focusAreas: true,
      }
    }
  }
}>

export type FunderForFund = Prisma.FundFunderGetPayload<{
  include: {
    funder: true
  }
}>

export type FundedLDAs = Prisma.FundLocalDevelopmentAgencyGetPayload<{
  include: {
    localDevelopmentAgency: true,
    fund: {
      select: {
        name: true,
        id: true
      }
    }
  }
}>

// Use object instead of {} to satisfy lint rule
export type Province = Prisma.ProvinceGetPayload<object>
