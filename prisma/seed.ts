import { PrismaClient } from '@prisma/client'
import { createHash } from '@/lib/hash'

const prisma = new PrismaClient()
async function main() {
  await prisma.localDevelopmentAgencyForm.deleteMany()
  await prisma.localDevelopmentAgency.deleteMany()
  await prisma.developmentStage.deleteMany()
  await prisma.fund.deleteMany()
  await prisma.funder.deleteMany()
  await prisma.fundingStatus.deleteMany()
  await prisma.focusArea.deleteMany()
  await prisma.location.deleteMany()
  await prisma.formStatus.deleteMany()
  await prisma.formTemplate.deleteMany()
  await prisma.user.deleteMany()

  const userNala = await prisma.user.create(
    {
      data: {
        email: 'nala@test.test',
        name: 'Nala Smith',
        passwordHash: await createHash('test12345'),
        approved: true,
        role: 'ADMIN'
      }
    })

  const userSihle = await prisma.user.create(
    {
      data: {
        email: 'sihle@test.test',
        name: 'Sihle Lonzi',
        passwordHash: await createHash('test12345'),
        role: 'PROGRAMME_OFFICER'
      }
    })

  const userConstance = await prisma.user.create(
    {
      data: {
        email: 'constance@test.test',
        name: 'Constance SeoposengweLonzi',
        passwordHash: await createHash('test12345'),
        role: 'USER'
      }
    })

  const formStatusPaused = await prisma.formStatus.create(
    {
      data: { label: 'Paused', icon: 'Pause' }
    }
  )

  const formStatusApproved = await prisma.formStatus.create(
    {
      data: { label: 'Approved', icon: 'Check' }
    }
  )

  const formStatusPending = await prisma.formStatus.create(
    {
      data: { label: 'Pending', icon: 'Clock' }
    }
  )

  const formStatusUpcoming = await prisma.formStatus.create(
    {
      data: { label: 'Upcoming', icon: 'Calendar' }
    }
  )

  const formStatusOverdue = await prisma.formStatus.create(
    {
      data: { label: 'Overdue', icon: 'TriangleAlert' }
    }
  )

  const formStatusUnderway = await prisma.formStatus.create(
    {
      data: { label: 'Underway', icon: 'Play' }
    }
  )

  const formStatusRejected = await prisma.formStatus.create(
    {
      data: { label: 'Rejected', icon: 'X' }
    }
  )

  const formTemplateGrantFundingApplication = await prisma.formTemplate.create(
    {
      data: {
        name: 'Grant Funding Application',
        description: 'Grant Funding Application form template',
        form: {
          "title": "Grant Funding Application | SCAT Data Process",
          "sections": [
            {
              "title": "SECTION 1: ORGANISATIONAL DETAILS",
              "fields": [
                {
                  "name": "name",
                  "type": "text",
                  "label": "Name of the organisation (LDA)",
                  "required": true
                },
                {
                  "name": "address",
                  "type": "textarea",
                  "label": "Physical address of the organisation (Name of street, section and place)",
                  "required": true
                },
                {
                  "name": "status",
                  "type": "textarea",
                  "label": "Registration status (NPO or PBO number and date of registration)",
                  "required": true
                }
              ]
            },
            {
              "title": "SECTION 2: GOVERNANCE AND MANAGEMENT",
              "fields": [
                {
                  "name": "list",
                  "type": "textarea",
                  "label": "List the names, surnames, and positions of the LDA Management Committee members (Board members)",
                  "required": true
                },
                {
                  "name": "list2",
                  "type": "textarea",
                  "label": "List the names and surnames of LDA staff (EG, coordinator, administrator, field worker, etc)  "
                }
              ]
            },
            {
              "title": "SECTION 3: VISION & MISSION",
              "fields": [
                {
                  "name": "vision",
                  "type": "textarea",
                  "label": "Vision",
                  "required": true
                },
                {
                  "name": "mission",
                  "type": "textarea",
                  "label": "Mission",
                  "required": true
                }
              ]
            }
          ]
        }
      }
    }
  )

  const formTemplateDFTApplication = await prisma.formTemplate.create(
    {
      data: {
        name: 'DFT Application',
        description: 'DFT Application form template',
        form: {
          "title": "DFT Application",
          "sections": []
        }
      }
    }
  )

  const formTemplateLDADFTClaimForm = await prisma.formTemplate.create(
    {
      data: {
        name: 'LDA DFT Claim Form',
        description: 'LDA DFT Claim Form form template',
        form: {
          "title": "LDA DFT Claim Form",
          "sections": []
        }
      }
    }
  )

  const formTemplateFRISApplication = await prisma.formTemplate.create(
    {
      data: {
        name: 'FRIS Application',
        description: 'FRIS Application form template',
        form: {
          "title": "FRIS Application",
          "sections": []
        }
      }
    }
  )

  const formTemplateFRISReport = await prisma.formTemplate.create(
    {
      data: {
        name: 'FRIS Report',
        description: 'FRIS Report form template',
        form: {
          "title": "FRIS Report",
          "sections": []
        }
      }
    }
  )

  const formTemplateFRISClaimForm = await prisma.formTemplate.create(
    {
      data: {
        name: 'FRIS Claim Form',
        description: 'FRIS Claim Form form template',
        form: {
          "title": "FRIS Claim Form",
          "sections": []
        }
      }
    }
  )

  const formTemplateNarrativeReport = await prisma.formTemplate.create(
    {
      data: {
        name: 'Narrative Report',
        description: 'Narrative Report form template',
        form: {
          "title": "Narrative Report",
          "sections": []
        }
      }
    }
  )

  const formTemplateFinanceReport = await prisma.formTemplate.create(
    {
      data: {
        name: 'Finance Report',
        description: 'Finance Report form template',
        form: {
          "title": "Finance Report",
          "sections": []
        }
      }
    }
  )

  const formTemplateFieldReportSCATPO = await prisma.formTemplate.create(
    {
      data: {
        name: 'Field Report (SCAT PO)',
        description: 'Field Report (SCAT PO) form template',
        form: {
          "title": "Field Report (SCAT PO)",
          "sections": []
        }
      }
    }
  )

  const formTemplateDFTReport = await prisma.formTemplate.create(
    {
      data: {
        name: 'DFT Report',
        description: 'DFT Report form template',
        form: {
          "title": "DFT Report",
          "sections": []
        }
      }
    }
  )

  const developmentStageEstablished = await prisma.developmentStage.create(
    {
      data: { label: 'Established', description: 'Established' }
    }
  )

  const developmentStageDepreciated = await prisma.developmentStage.create(
    {
      data: { label: 'Depreciated', description: 'Depreciated' }
    }
  )

  const developmentStageEmerging = await prisma.developmentStage.create(
    {
      data: { label: 'Emerging', description: 'Emerging' }
    }
  )

  const fundingStatusUnderway = await prisma.fundingStatus.create(
    {
      data: { label: 'Underway', description: 'Underway' }
    })

  const fundingStatusPaused = await prisma.fundingStatus.create(
    {
      data: { label: 'Paused', description: 'Paused' },
    })

  const fundingStatusDelayed = await prisma.fundingStatus.create(
    {
      data: { label: 'Delayed', description: 'Delayed' }
    })

  const fundingStatusDead = await prisma.fundingStatus.create(
    {
      data: { label: 'Dead', description: 'Dead' }
    })

  const fundingStatusFinished = await prisma.fundingStatus.create(
    {
      data: { label: 'Finished', description: 'Finished' }
    })

  const focusAreaTransport = await prisma.focusArea.create(
    {
      data: { label: 'Transport', icon: 'Plane' }
    })

  const focusAreaClimateResilience = await prisma.focusArea.create(
    {
      data: { label: 'Climate Resilience', icon: 'Thermometer' }
    })

  const focusAreaFoodResilience = await prisma.focusArea.create(
    {
      data: { label: 'Food Security', icon: 'Utensils' }
    })

  const focusAreaYouth = await prisma.focusArea.create(
    {
      data: { label: 'Youth', icon: 'PersonStanding' }
    })

  const focusEcological = await prisma.focusArea.create(
    {
      data: { label: 'Ecological', icon: 'Leaf' }
    })

  const locationNorthernCape = await prisma.location.create(
    {
      data: { label: 'Northern Cape', short: 'NC' }
    })

  const locationGauteng = await prisma.location.create(
    {
      data: { label: 'Gauteng', short: 'GT' }
    })

  const locationEasternCape = await prisma.location.create(
    {
      data: { label: 'Eastern Cape', short: 'EC' }
    })

  const locationWesternCape = await prisma.location.create(
    {
      data: { label: 'Western Cape', short: 'WC' }
    })

  const funderWoolworths = await prisma.funder.create(
    {
      data: {
        name: 'Woolworths',
        about: `As a South African retailer, we are faced with complex social challenges, and we believe in working together to make a real difference. 
      Every programme or initiative we launch makes room for collaboration with one or more of our partners or suppliers. 
      We take this approach in every country in which we operate and tailor the way we do things to their specific social context. 
      In South Africa, our social development efforts are overseen by the Woolworths Trust. 
      Established in 2003, The Woolworths Trust is managed by a Board of Trustees and reports to the WHL Social and Ethics Committee.`,
        amount: 12345,

        fundingStatus: { connect: { id: fundingStatusUnderway.id } },

        locations: {
          connect: [
            { id: locationEasternCape.id },
            { id: locationWesternCape.id },
          ],
        },
        focusAreas: {
          connect: [
            { id: focusAreaClimateResilience.id },
            { id: focusAreaFoodResilience.id },
            { id: focusAreaYouth.id },
          ],
        },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      },
    })

  const fundCommunityGardeningFund = await prisma.fund.create(
    {
      data: {
        funder: { connect: { id: funderWoolworths.id } },
        name: 'Community Gardening fund',
        about: 'How can learners stay safe when many schools throughout South Africa don’t have SUSTAINABLE access to water? Together with the MySchool MyVillage MyPlanet Programme, Woolworths started the WOOLIES WATER FUND to raise funds and give schools sustainable access to clean water. We did so by installing rainwater tanks in schools across three provinces as well as installing 600+ handwashing stations and helping to educate learners about the importance of water conservation and the preservation of this resource through the Woolworths Making the Programme digital platform.',
        amount: 9999999,
        fundingStatus: { connect: { id: fundingStatusDelayed.id } },
        focusAreas: {
          connect: [{ id: focusEcological.id }]
        },
        locations: {
          connect: [
            { id: locationEasternCape.id },
            { id: locationWesternCape.id },
          ],
        },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      },
    })

  const funderCSA = await prisma.funder.create(
    {
      data: {
        name: 'CSA',
        about: `Cricket South Africa funds many worthwile cricket clubs`,
        amount: 78923,
        fundingStatus: { connect: { id: fundingStatusDead.id } },
        locations: {
          connect: [{ id: locationNorthernCape.id }]
        },
        focusAreas: {
          connect: [{ id: focusAreaTransport.id }]
        },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      }
    })

  const fundCricket = await prisma.fund.create(
    {
      data: {
        funder: { connect: { id: funderCSA.id } },
        name: 'Strikers Cricket Fund ',
        about: 'A fund for cricket lovers in parternship with Strikers',
        amount: 500,
        fundingStatus: { connect: { id: fundingStatusFinished.id } },
        locations: {
          connect: [{ id: locationNorthernCape.id }]
        },
        focusAreas: {
          connect: [{ id: focusAreaTransport.id }]
        },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      }
    })

  const funderShoprite = await prisma.funder.create(
    {
      data: {
        name: 'Shoprite',
        about: "As a South African retailer, we are faced with complex social challenges, and we believe in working together to make a real difference. Every programme or initiative we launch makes room for collaboration with one or more of our partners or suppliers. We take this approach in every country in which we operate, and are sure to tailor the way we do things to their specific social context. In South Africa, our social development efforts are overseen by the Woolworths Trust. Established in 2003, The Woolworths Trust is managed by a Board of Trustees, and reports to the WHL Social and Ethics Committee.",
        amount: 121921,
        fundingStatus: { connect: { id: fundingStatusPaused.id } },
        locations: {
          connect: [
            { id: locationGauteng.id }
          ]
        },
        focusAreas: {
          connect: [
            { id: focusAreaClimateResilience.id }
          ],
        },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      }
    })

  const fundYouthDevelopmentFund = await prisma.fund.create(
    {
      data: {
        funder: { connect: { id: funderShoprite.id } },
        name: 'Youth Development Fund',
        about: 'How can learners stay safe when many schools throughout South Africa don’t have SUSTAINABLE access to water? Together with the MySchool MyVillage MyPlanet Programme, Woolworths started the WOOLIES WATER FUND to raise funds and give schools sustainable access to clean water. We did so by installing rainwater tanks in schools across three provinces as well as installing 600+ handwashing stations and helping to educate learners about the importance of water conservation and the preservation of this resource through the Woolworths Making the Programme digital platform.',
        amount: 891289,
        fundingStatus: { connect: { id: fundingStatusUnderway.id } },
        focusAreas: {
          connect: [{ id: focusAreaYouth.id }]
        },
        locations: {
          connect: [
            { id: locationEasternCape.id },
            { id: locationWesternCape.id },
          ],
        },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      },
    })

  const ldaOtsile = await prisma.localDevelopmentAgency.create(
    {
      data: {
        name: 'Otsile Bokamosho Community Organization',
        about: 'The Inter-Church Local Development Agency (ILDA) was founded by Molly Blackburn, Bishop Michael Coleman, Judy Chalmers and other community leaders as a direct response to the Langa massacre. Initially its main objective was obtaining legal assistance for those affected along with offering support to families looking for missing relatives. These days they offer paralegal services and are currently championing the development and introduction of the Asset Based Community Development Approach in that part of the Eastern Cape.',
        totalFundingRounds: 3,
        developmentStage: { connect: { id: developmentStageEstablished.id } },
        fundingStatus: { connect: { id: fundingStatusDead.id } },
        amount: 1000,
        focusAreas: { connect: { id: focusAreaTransport.id } },
        location: { connect: { id: locationNorthernCape.id } },
        funds: { connect: { id: fundCricket.id } },
        programmeOfficer: { connect: { id: userNala.id } },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      }
    })

  const ldaInterchurchLocalDevelopmentAgency = await prisma.localDevelopmentAgency.create(
    {
      data: {
        name: 'Interchurch Local Development Agency',
        about: 'The Inter-Church Local Development Agency (ILDA) was founded by Molly Blackburn, Bishop Michael Coleman, Judy Chalmers and other community leaders as a direct response to the Langa massacre. Initially its main objective was obtaining legal assistance for those affected along with offering support to families looking for missing relatives. These days they offer paralegal services and are currently championing the development and introduction of the Asset Based Community Development Approach in that part of the Eastern Cape.',
        totalFundingRounds: 3,
        developmentStage: { connect: { id: developmentStageDepreciated.id } },
        fundingStatus: { connect: { id: fundingStatusDead.id } },
        amount: 1000,
        focusAreas: {
          connect: { id: focusAreaTransport.id }
        },
        location: { connect: { id: locationNorthernCape.id } },
        funds: {
          connect: { id: fundCommunityGardeningFund.id }
        },
        programmeOfficer: { connect: { id: userNala.id } },
        organisationDetail: {
          create: {
            contactNumber: "",
            email: "",
            website: "",
            addressStreet: "",
            addressComplex: "",
            addressCity: "",
            addressProvince: "",
            coordinates: ""
          },
        },
      }
    })

  const organisationDetailLdaZanoncedoEmpowermentCentre = await prisma.organisationDetail.create(
    {
      data: {
        contactNumber: '+27613280567',
        email: 'contact@test.test',
        website: 'https://www.test.test',
        addressStreet: '12 Smith Street',
        addressComplex: 'Unit 2, James Park',
        addressCity: 'Jameserton',
        addressProvince: 'Free State',
        coordinates: '52.681950; -2.590400'
      }
    })

  const ldaZanoncedoEmpowermentCentre = await prisma.localDevelopmentAgency.create(
    {
      data: {
        name: 'Zanoncedo Empowerment Centre',
        about: 'The Inter-Church Local Development Agency (ILDA) was founded by Molly Blackburn, Bishop Michael Coleman, Judy Chalmers and other community leaders as a direct response to the Langa massacre. Initially its main objective was obtaining legal assistance for those affected along with offering support to families looking for missing relatives. These days they offer paralegal services and are currently championing the development and introduction of the Asset Based Community Development Approach in that part of the Eastern Cape.',
        totalFundingRounds: 3,
        developmentStageId: developmentStageEmerging.id,
        fundingStatusId: fundingStatusDelayed.id,
        amount: 1000,
        focusAreas: {
          connect: [{ id: focusAreaClimateResilience.id }, { id: focusAreaTransport.id }]
        },
        locationId: locationGauteng.id,
        funds: {
          connect: [{ id: fundCommunityGardeningFund.id }, { id: fundYouthDevelopmentFund.id }]
        },
        programmeOfficerId: userNala.id,
        organisationDetailId: organisationDetailLdaZanoncedoEmpowermentCentre.id
      }
    })

  const localDevelopmentAgencyFormGrantFundingApplication = await prisma.localDevelopmentAgencyForm.create(
    {
      data: {
        formStatusId: formStatusApproved.id,
        localDevelopmentAgencyId: ldaZanoncedoEmpowermentCentre.id,
        formTemplateId: formTemplateGrantFundingApplication.id,
        formData: {},
        title: 'Grant Funding Application (2024)'
      }
    })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })