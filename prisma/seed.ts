import { PrismaClient } from '@prisma/client'
import { createHash } from '@/lib/hash'
import imagekit from "@/lib/imagekit"
import fs from 'fs'
import path from 'path'
import { ZA_PROVINCES } from '@/constants/province'


// Uploads to ImageKit storage and returns the URL
// Test/seed files in @/db/seed e.g. 
// @/db/seed/media/cdra_legacy.jpg
const uploadFile = async (filename: string) => {
  const filePath = path.join(process.cwd(), filename)
  const fileBuffer = fs.readFileSync(filePath)
  const fileBase64 = fileBuffer.toString("base64")
  const fileName = filename.split('/').pop()

  if (!fileName) throw new Error('Invalid filename')

  const uploadResponse = await imagekit.upload({
    file: fileBase64,
    fileName: fileName,
  })

  return uploadResponse.filePath
}

const prisma = new PrismaClient()

async function main() {
  await prisma.media.deleteMany()
  await prisma.localDevelopmentAgencyForm.deleteMany()
  await prisma.fundLocalDevelopmentAgency.deleteMany()
  await prisma.fundFunder.deleteMany()
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
  await prisma.province.deleteMany()

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

  await prisma.user.create(
    {
      data: {
        email: 'sihle@test.test',
        name: 'Sihle Lonzi',
        passwordHash: await createHash('test12345'),
        role: 'PROGRAMME_OFFICER'
      }
    })

  await prisma.user.create(
    {
      data: {
        email: 'constance@test.test',
        name: 'Constance SeoposengweLonzi',
        passwordHash: await createHash('test12345'),
        role: 'USER'
      }
    })

  await prisma.formStatus.create(
    {
      data: { label: 'Paused', icon: 'Pause' }
    }
  )

  const formStatusApproved = await prisma.formStatus.create(
    {
      data: { label: 'Approved', icon: 'Check' }
    }
  )

  await prisma.formStatus.create(
    {
      data: { label: 'Pending', icon: 'Clock' }
    }
  )

  await prisma.formStatus.create(
    {
      data: { label: 'Upcoming', icon: 'Calendar' }
    }
  )

  await prisma.formStatus.create(
    {
      data: { label: 'Overdue', icon: 'TriangleAlert' }
    }
  )

  await prisma.formStatus.create(
    {
      data: { label: 'Underway', icon: 'Play' }
    }
  )

  await prisma.formStatus.create(
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
        fundingStatus: 'Active',
        fundingStart: new Date('2024-01-01'),
        fundingEnd: new Date('2025-12-31'),
        focusAreas: {
          connect: [
            { id: focusAreaClimateResilience.id },
            { id: focusAreaFoodResilience.id },
            { id: focusAreaYouth.id },
          ],
        },
        organisationDetail: {
          create: {},
        },
      },
    })

  const fundCommunityGardeningFund = await prisma.fund.create(
    {
      data: {
        name: 'Community Gardening fund',
        about: `How can learners stay safe when many schools throughout South Africa don't have SUSTAINABLE access to water? Together with the MySchool MyVillage MyPlanet Programme, Woolworths started the WOOLIES WATER FUND to raise funds and give schools sustainable access to clean water. We did so by installing rainwater tanks in schools across three provinces as well as installing 600+ handwashing stations and helping to educate learners about the importance of water conservation and the preservation of this resource through the Woolworths Making the Programme digital platform.`,
        amount: 9999999,
        fundingStatus: 'Active',
        fundingStart: new Date('2024-01-01'),
        fundingEnd: new Date('2025-12-31'),
        focusAreas: {
          connect: [{ id: focusEcological.id }]
        },
        organisationDetail: {
          create: {},
        },
      },
    })

  // Link Funder to Fund
  await prisma.fundFunder.create({
    data: {
      fundId: fundCommunityGardeningFund.id,
      funderId: funderWoolworths.id,
      amount: 500000,
      fundingStart: new Date('2024-01-01'),
      fundingEnd: new Date('2025-12-31'),
      notes: 'Primary funder for community gardening initiative'
    }
  })

  const funderCSA = await prisma.funder.create(
    {
      data: {
        name: 'CSA',
        about: `Cricket South Africa funds many worthwile cricket clubs`,
        amount: 78923,
        fundingStatus: 'Cancelled',
        fundingStart: new Date('2023-01-01'),
        fundingEnd: new Date('2023-12-31'),
        focusAreas: {
          connect: [{ id: focusAreaTransport.id }]
        },
        organisationDetail: {
          create: {},
        },
      }
    })

  const fundCricket = await prisma.fund.create(
    {
      data: {
        name: 'Strikers Cricket Fund ',
        about: 'A fund for cricket lovers in parternship with Strikers',
        amount: 500,
        fundingStatus: 'Cancelled',
        fundingStart: new Date('2023-01-01'),
        fundingEnd: new Date('2023-12-31'),
        focusAreas: {
          connect: [{ id: focusAreaTransport.id }]
        },
        organisationDetail: {
          create: {},
        },
      }
    })

  // Link Funder to Fund
  await prisma.fundFunder.create({
    data: {
      fundId: fundCricket.id,
      funderId: funderCSA.id,
      amount: 500,
      fundingStart: new Date('2023-01-01'),
      fundingEnd: new Date('2023-12-31'),
      notes: 'Cricket development funding'
    }
  })

  const funderShoprite = await prisma.funder.create(
    {
      data: {
        name: 'Shoprite',
        about: "As a South African retailer, we are faced with complex social challenges, and we believe in working together to make a real difference. Every programme or initiative we launch makes room for collaboration with one or more of our partners or suppliers. We take this approach in every country in which we operate, and are sure to tailor the way we do things to their specific social context. In South Africa, our social development efforts are overseen by the Woolworths Trust. Established in 2003, The Woolworths Trust is managed by a Board of Trustees, and reports to the WHL Social and Ethics Committee.",
        amount: 121921,
        fundingStatus: 'Paused',
        fundingStart: new Date('2024-01-01'),
        fundingEnd: new Date('2025-12-31'),
        focusAreas: {
          connect: [
            { id: focusAreaClimateResilience.id }
          ],
        },
        organisationDetail: {
          create: {},
        },
      }
    })

  const fundYouthDevelopmentFund = await prisma.fund.create(
    {
      data: {
        name: 'Youth Development Fund',
        about: `How can learners stay safe when many schools throughout South Africa don't have SUSTAINABLE access to water? Together with the MySchool MyVillage MyPlanet Programme, Woolworths started the WOOLIES WATER FUND to raise funds and give schools sustainable access to clean water. We did so by installing rainwater tanks in schools across three provinces as well as installing 600+ handwashing stations and helping to educate learners about the importance of water conservation and the preservation of this resource through the Woolworths Making the Programme digital platform.`,
        amount: 891289,
        fundingStatus: 'Active',
        fundingStart: new Date('2024-06-01'),
        fundingEnd: new Date('2026-05-31'),
        focusAreas: {
          connect: [{ id: focusAreaYouth.id }]
        },
        organisationDetail: {
          create: {},
        },
      },
    })

  // Link Funder to Fund
  await prisma.fundFunder.create({
    data: {
      fundId: fundYouthDevelopmentFund.id,
      funderId: funderShoprite.id,
      amount: 891289,
      fundingStart: new Date('2024-06-01'),
      fundingEnd: new Date('2026-05-31'),
      notes: 'Youth empowerment and development program'
    }
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
        programmeOfficer: { connect: { id: userNala.id } },
        organisationDetail: {
          create: {},
        },
      }
    })

  // Link LDA to Fund
  await prisma.fundLocalDevelopmentAgency.create({
    data: {
      fundId: fundCricket.id,
      localDevelopmentAgencyId: ldaOtsile.id,
      description: 'Cricket development funding for community organization',
      fundingStart: new Date('2023-01-01'),
      fundingEnd: new Date('2023-12-31'),
      fundingStatus: 'Cancelled'
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
        programmeOfficer: { connect: { id: userNala.id } },
        organisationDetail: {
          create: {},
        },
      },
    },
  )

  // Link LDA to Fund
  await prisma.fundLocalDevelopmentAgency.create({
    data: {
      fundId: fundCommunityGardeningFund.id,
      localDevelopmentAgencyId: ldaInterchurchLocalDevelopmentAgency.id,
      description: 'Community gardening initiative support',
      fundingStart: new Date('2024-01-01'),
      fundingEnd: new Date('2025-12-31'),
      fundingStatus: 'Active'
    }
  })

  const organisationDetailLdaZanoncedoEmpowermentCentre = await prisma.organisationDetail.create(
    {
      data: {
        contactNumber: '+27613280567',
        email: 'contact@test.test',
        website: 'https://www.test.test',
        physicalStreet: '12 Smith Street',
        physicalComplexName: 'Unit 2, James Park',
        physicalCity: 'Jameserton',
        physicalProvince: 'Free State',
        useDifferentPostalAddress: false,
        postalStreet: '12 Smith Street',
        postalComplexName: 'Unit 2, James Park',
        postalCity: 'Jameserton',
        postalProvince: 'Free State',
        latitude: 52.681950,
        longitude: -2.590400,
        mapAddress: '12 Smith Street, Unit 2, James Park, Jameserton, Free State',
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
        programmeOfficerId: userNala.id,
        organisationDetailId: organisationDetailLdaZanoncedoEmpowermentCentre.id
      }
    })

  // Link LDA to Funds
  await prisma.fundLocalDevelopmentAgency.create({
    data: {
      fundId: fundCommunityGardeningFund.id,
      localDevelopmentAgencyId: ldaZanoncedoEmpowermentCentre.id,
      description: 'Community gardening and ecological development',
      fundingStart: new Date('2024-01-01'),
      fundingEnd: new Date('2025-12-31'),
      fundingStatus: 'Active'
    }
  })

  await prisma.fundLocalDevelopmentAgency.create({
    data: {
      fundId: fundYouthDevelopmentFund.id,
      localDevelopmentAgencyId: ldaZanoncedoEmpowermentCentre.id,
      description: 'Youth empowerment and skills development',
      fundingStart: new Date('2024-06-01'),
      fundingEnd: new Date('2026-05-31'),
      fundingStatus: 'Active'
    }
  })

  await prisma.localDevelopmentAgencyForm.create(
    {
      data: {
        formStatusId: formStatusApproved.id,
        localDevelopmentAgencyId: ldaZanoncedoEmpowermentCentre.id,
        formTemplateId: formTemplateGrantFundingApplication.id,
        formData: {},
        title: 'Grant Funding Application (2024)'
      }
    })

  await prisma.media.create(
    {
      data: {
        title: "The CDRA Legacy",
        description: "SCAT is grateful for the legacy of the Community Development Resource Association (CDRA) which we are benefitting from in many ways. SCAT has been gifted CDRA House at 52-54 Francis Street in Woodstock, Cape Town.",
        filePath: await uploadFile('db/seed/media/cdra_legacy.jpg'),
        localDevelopmentAgency: { connect: { id: ldaOtsile.id } },
      }
    })

  await prisma.media.create(
    {
      data: {
        title: "Community Mapping",
        description: "So the last blog made me reflect on community mapping experiences and if it would be a good idea to share a way to do it. I decided that it would be.",
        filePath: await uploadFile('db/seed/media/community_mapping.jpg'),
        localDevelopmentAgency: { connect: { id: ldaOtsile.id } },
        mediaType: 'PHOTOGRAPH'
      }
    })

  await prisma.media.create(
    {
      data: {
        title: "The Basic Income Grant Campaign",
        description: "SCAT is part of a group of civil society organizations that have seen a need to robustly engage our government about the socio – economic situation of the South Africa citizens who have little or no income.",
        filePath: await uploadFile('db/seed/media/the_basic_income_grant_campaign.jpg'),
        localDevelopmentAgency: { connect: { id: ldaOtsile.id } },
        mediaType: 'GRAPHIC'
      }
    })

  await prisma.document.create(
    {
      data: {
        title: "Chairperson’s Report",
        description: "Notice is hereby given that an Annual General Meeting of Social Change Assistance Trust (SCAT) – Trust Registration No, T70/85 will be hold via Zoom on Wednesday 22 June 2022 from 16h00 to 17h00.",
        filePath: await uploadFile('db/seed/documents/Chairpersons-Report-2021_v4_20June.pdf'),
        localDevelopmentAgency: { connect: { id: ldaOtsile.id } },
        documentType: 'DOC',
        validFromDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        validUntilDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
      }
    })

  // Find all LDAs where operations is null
  const ldasWithoutOps = await prisma.localDevelopmentAgency.findMany({
    where: { operations: null },
    select: { id: true },
  })

  for (const lda of ldasWithoutOps) {
    await prisma.organisationOperations.create({
      data: {
        localDevelopmentAgencyId: lda.id,
      },
    })
  }

  for (const provinceData of ZA_PROVINCES) {
    // Create the province with districts as JSON
    await prisma.province.upsert({
      where: { code: provinceData.code },
      update: {
        name: provinceData.name,
        districts: provinceData.districts ? JSON.parse(JSON.stringify(provinceData.districts)) : [], // Store districts as JSON
      },
      create: {
        name: provinceData.name,
        code: provinceData.code,
        districts: provinceData.districts ? JSON.parse(JSON.stringify(provinceData.districts)) : [], // Store districts as JSON
      },
    })
  }
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