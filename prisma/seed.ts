/**
 * Seed a local database with test data: users for each role, lookup data,
 * funders/funds/LDAs, form categories with report timing, the form templates
 * from `form-templates/`, and example forms whose reports are planned (and the
 * ones already due created) through the same code the app uses.
 *
 * Wipes every table first. Run with `yarn db:seed` (or `yarn db:reset`).
 * All seeded users sign in with the password `test12345`.
 */
import fs from "fs"
import path from "path"
import { Prisma, Role } from "@prisma/client"
import prisma from "@/db"
import { createHash } from "@/lib/hash"
import imagekit from "@/lib/imagekit"
import { ZA_PROVINCES } from "@/constants/province"
import { placeForm } from "@/lib/primary-form"
import { applyStatusReports, planReports } from "@/lib/report-rules"

// "Today" for the example forms; reports due by then are created
const TODAY = new Date()
const PASSWORD = "test12345"
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Empty every table (keeps the migration history), so the seed can be re-run. */
async function wipe() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tables.length === 0) return
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ")
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}

/** A template's form definition from `form-templates/` (an empty file gives an empty form). */
function templateForm(file: string, title: string): Prisma.InputJsonValue {
  const text = fs.readFileSync(path.join(process.cwd(), "form-templates", file), "utf8").trim()
  return text ? JSON.parse(text) : { title, sections: [] }
}

/** Upload a seed file to ImageKit; null (and a warning) when ImageKit isn't configured or the upload fails. */
async function uploadFile(filename: string): Promise<string | null> {
  if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_PUBLIC_KEY) return null
  try {
    const file = fs.readFileSync(path.join(process.cwd(), filename)).toString("base64")
    const upload = await imagekit().upload({ file, fileName: path.basename(filename) })
    return upload.filePath
  } catch (error) {
    console.warn(`  Couldn't upload ${filename}: ${(error as Error).message}`)
    return null
  }
}

const LDA_ABOUT =
  "The Inter-Church Local Development Agency (ILDA) was founded by Molly Blackburn, Bishop Michael Coleman, Judy Chalmers and other community leaders as a direct response to the Langa massacre. These days they offer paralegal services and are championing the Asset Based Community Development Approach in that part of the Eastern Cape."
const FUND_ABOUT =
  "How can learners stay safe when many schools throughout South Africa don't have sustainable access to water? This fund installs rainwater tanks and handwashing stations in schools and teaches learners about water conservation."

// Who can do what with forms from a template (SUPER_USER can always do everything)
const APPLICATION_ROLES = {
  createRoles: [Role.USER, Role.PROGRAMME_OFFICER, Role.ADMIN],
  readRoles: [Role.USER, Role.PROGRAMME_OFFICER, Role.ADMIN],
  fillRoles: [Role.USER, Role.PROGRAMME_OFFICER, Role.ADMIN],
  approveRoles: [Role.PROGRAMME_OFFICER, Role.ADMIN],
}
const REPORT_ROLES = {
  createRoles: [Role.PROGRAMME_OFFICER, Role.ADMIN],
  readRoles: [Role.USER, Role.PROGRAMME_OFFICER, Role.ADMIN],
  fillRoles: [Role.USER, Role.PROGRAMME_OFFICER, Role.ADMIN],
  approveRoles: [Role.PROGRAMME_OFFICER, Role.ADMIN],
}
const STAFF_ONLY_ROLES = {
  createRoles: [Role.PROGRAMME_OFFICER, Role.ADMIN],
  readRoles: [Role.PROGRAMME_OFFICER, Role.ADMIN],
  fillRoles: [Role.PROGRAMME_OFFICER, Role.ADMIN],
  approveRoles: [Role.ADMIN],
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Wiping tables…")
  await wipe()

  // Users ---------------------------------------------------------------------
  const passwordHash = await createHash(PASSWORD)
  const user = (email: string, name: string, role: Role) =>
    prisma.user.create({ data: { email, name, passwordHash, role, approved: true } })
  await user("super@test.test", "Sam Super", Role.SUPER_USER)
  const admin = await user("nala@test.test", "Nala Smith", Role.ADMIN)
  const officer = await user("sihle@test.test", "Sihle Lonzi", Role.PROGRAMME_OFFICER)
  const member = await user("constance@test.test", "Constance Seoposengwe", Role.USER)

  // Lookup data ---------------------------------------------------------------
  await prisma.mediaSourceType.create({ data: { title: "Uploaded" } }) // preselected for manual uploads

  const statuses = Object.fromEntries(
    await Promise.all(
      [
        ["Draft", "FileEdit"],
        ["UnderReview", "Eye"],
        ["Approved", "Check"],
        ["Underway", "Play"],
        ["Pending", "Clock"],
        ["Upcoming", "Calendar"],
        ["Overdue", "TriangleAlert"],
        ["Paused", "Pause"],
        ["Rejected", "X"],
      ].map(async ([label, icon]) => [label, await prisma.formStatus.create({ data: { label, icon } })] as const),
    ),
  )

  const [established, , emerging] = await Promise.all(
    ["Established", "Depreciated", "Emerging"].map((label) => prisma.developmentStage.create({ data: { label, description: label } })),
  )
  const [underway, , delayed] = await Promise.all(
    ["Underway", "Paused", "Delayed", "Dead", "Finished"].map((label) => prisma.fundingStatus.create({ data: { label, description: label } })),
  )
  const [transport, climate, food, youth, ecological] = await Promise.all(
    [
      ["Transport", "Plane"],
      ["Climate Resilience", "Thermometer"],
      ["Food Security", "Utensils"],
      ["Youth", "PersonStanding"],
      ["Ecological", "Leaf"],
    ].map(([label, icon]) => prisma.focusArea.create({ data: { label, icon } })),
  )
  const [northernCape, gauteng, easternCape] = await Promise.all(
    [
      ["Northern Cape", "NC"],
      ["Gauteng", "GT"],
      ["Eastern Cape", "EC"],
      ["Western Cape", "WC"],
    ].map(([label, short]) => prisma.location.create({ data: { label, short } })),
  )
  for (const province of ZA_PROVINCES) {
    await prisma.province.create({
      data: { name: province.name, code: province.code, districts: JSON.parse(JSON.stringify(province.districts ?? [])) },
    })
  }

  // Funders and funds ---------------------------------------------------------
  const woolworths = await prisma.funder.create({
    data: {
      name: "Woolworths",
      about: "The Woolworths Trust oversees Woolworths' social development work in South Africa, in partnership with suppliers and community organisations.",
      amount: 1200000,
      fundingStatus: "Active",
      fundingStart: day("2026-01-01"),
      fundingEnd: day("2027-12-31"),
      focusAreas: { connect: [{ id: climate.id }, { id: food.id }, { id: youth.id }] },
      organisationDetail: { create: {} },
    },
  })
  const shoprite = await prisma.funder.create({
    data: {
      name: "Shoprite",
      about: "Shoprite funds youth development and climate resilience projects in the communities it serves.",
      amount: 900000,
      fundingStatus: "Active",
      fundingStart: day("2026-04-01"),
      fundingEnd: day("2028-03-31"),
      focusAreas: { connect: [{ id: climate.id }] },
      organisationDetail: { create: {} },
    },
  })
  const csa = await prisma.funder.create({
    data: {
      name: "CSA",
      about: "Cricket South Africa funds community cricket clubs.",
      amount: 78923,
      fundingStatus: "Cancelled",
      fundingStart: day("2023-01-01"),
      fundingEnd: day("2023-12-31"),
      focusAreas: { connect: [{ id: transport.id }] },
      organisationDetail: { create: {} },
    },
  })

  const gardening = await prisma.fund.create({
    data: {
      name: "Community Gardening Fund",
      about: FUND_ABOUT,
      amount: 500000,
      fundingStatus: "Active",
      fundingStart: day("2026-01-01"),
      fundingEnd: day("2027-12-31"),
      focusAreas: { connect: [{ id: ecological.id }] },
      organisationDetail: { create: {} },
    },
  })
  const youthFund = await prisma.fund.create({
    data: {
      name: "Youth Development Fund",
      about: FUND_ABOUT,
      amount: 891289,
      fundingStatus: "Active",
      fundingStart: day("2026-04-01"),
      fundingEnd: day("2028-03-31"),
      focusAreas: { connect: [{ id: youth.id }] },
      organisationDetail: { create: {} },
    },
  })
  const cricket = await prisma.fund.create({
    data: {
      name: "Strikers Cricket Fund",
      about: "A fund for cricket lovers in partnership with Strikers.",
      amount: 500,
      fundingStatus: "Cancelled",
      fundingStart: day("2023-01-01"),
      fundingEnd: day("2023-12-31"),
      focusAreas: { connect: [{ id: transport.id }] },
      organisationDetail: { create: {} },
    },
  })
  await prisma.fundFunder.createMany({
    data: [
      { fundId: gardening.id, funderId: woolworths.id, amount: 500000, fundingStart: day("2026-01-01"), fundingEnd: day("2027-12-31"), notes: "Primary funder for community gardening" },
      { fundId: youthFund.id, funderId: shoprite.id, amount: 891289, fundingStart: day("2026-04-01"), fundingEnd: day("2028-03-31"), notes: "Youth empowerment and development" },
      { fundId: cricket.id, funderId: csa.id, amount: 500, fundingStart: day("2023-01-01"), fundingEnd: day("2023-12-31"), notes: "Cricket development funding" },
    ],
  })

  // LDAs ----------------------------------------------------------------------
  const zanoncedo = await prisma.localDevelopmentAgency.create({
    data: {
      name: "Zanoncedo Empowerment Centre",
      about: LDA_ABOUT,
      totalFundingRounds: 3,
      amount: 250000,
      developmentStage: { connect: { id: emerging.id } },
      fundingStatus: { connect: { id: underway.id } },
      location: { connect: { id: gauteng.id } },
      programmeOfficer: { connect: { id: officer.id } },
      focusAreas: { connect: [{ id: climate.id }, { id: youth.id }] },
      organisationDetail: {
        create: {
          contactNumber: "+27613280567",
          email: "contact@test.test",
          website: "https://www.test.test",
          physicalStreet: "12 Smith Street",
          physicalComplexName: "Unit 2, James Park",
          physicalCity: "Johannesburg",
          physicalProvince: "Gauteng",
          useDifferentPostalAddress: false,
          latitude: -26.2041,
          longitude: 28.0473,
          mapAddress: "12 Smith Street, Johannesburg, Gauteng",
        },
      },
    },
  })
  const interchurch = await prisma.localDevelopmentAgency.create({
    data: {
      name: "Interchurch Local Development Agency",
      about: LDA_ABOUT,
      totalFundingRounds: 2,
      amount: 180000,
      developmentStage: { connect: { id: established.id } },
      fundingStatus: { connect: { id: underway.id } },
      location: { connect: { id: easternCape.id } },
      programmeOfficer: { connect: { id: officer.id } },
      focusAreas: { connect: [{ id: food.id }] },
      organisationDetail: { create: {} },
    },
  })
  const otsile = await prisma.localDevelopmentAgency.create({
    data: {
      name: "Otsile Bokamosho Community Organization",
      about: LDA_ABOUT,
      totalFundingRounds: 1,
      amount: 1000,
      developmentStage: { connect: { id: established.id } },
      fundingStatus: { connect: { id: delayed.id } },
      location: { connect: { id: northernCape.id } },
      programmeOfficer: { connect: { id: admin.id } },
      focusAreas: { connect: [{ id: transport.id }] },
      organisationDetail: { create: {} },
    },
  })
  for (const lda of [zanoncedo, interchurch, otsile]) {
    await prisma.organisationOperations.create({ data: { localDevelopmentAgencyId: lda.id } })
  }
  // Constance is a member of Zanoncedo, so she sees that LDA and its forms
  await prisma.localDevelopmentAgencyUser.create({ data: { userId: member.id, localDevelopmentAgencyId: zanoncedo.id } })

  await prisma.fundLocalDevelopmentAgency.createMany({
    data: [
      { fundId: gardening.id, localDevelopmentAgencyId: zanoncedo.id, description: "Community gardening and ecological development", fundingStart: day("2026-04-01"), fundingEnd: day("2027-03-31"), fundingStatus: "Active" },
      { fundId: youthFund.id, localDevelopmentAgencyId: zanoncedo.id, description: "Youth empowerment and skills development", fundingStart: day("2026-04-01"), fundingEnd: day("2028-03-31"), fundingStatus: "Active" },
      { fundId: gardening.id, localDevelopmentAgencyId: interchurch.id, description: "Community gardening support", fundingStart: day("2026-04-01"), fundingEnd: day("2027-03-31"), fundingStatus: "Active" },
      { fundId: cricket.id, localDevelopmentAgencyId: otsile.id, description: "Cricket development funding", fundingStart: day("2023-01-01"), fundingEnd: day("2023-12-31"), fundingStatus: "Cancelled" },
    ],
  })

  // Form categories and report timing -----------------------------------------
  // Applications: primary forms group a funding period; secondary forms sit under one.
  // Reports: their timing; attached to application categories below.
  const category = (key: string, label: string, role: "PRIMARY" | "SECONDARY" | "REPORT", extra: Prisma.FormCategoryUncheckedCreateInput | object = {}) =>
    prisma.formCategory.create({ data: { key, label, role, ...extra } })
  const grantFunding = await category("grant_funding", "Grant Funding", "PRIMARY")
  const frisApplication = await category("fris_application", "FRIS Application", "PRIMARY")
  const dftApplication = await category("dft_application", "DFT Application", "SECONDARY", { parentCategoryId: grantFunding.id })
  const frisClaim = await category("fris_claim", "FRIS Claim", "SECONDARY", { parentCategoryId: frisApplication.id })
  const narrativeReport = await category("narrative_report", "Narrative Report", "REPORT", {
    reportKind: "PERIODIC", reportPeriodMonths: 3, reportOpensDaysBefore: 14, reportDueDaysAfterPeriodEnd: 15,
  })
  const financeReport = await category("finance_report", "Finance Report", "REPORT", {
    reportKind: "PERIODIC", reportPeriodMonths: 6, reportOpensDaysBefore: 14, reportDueDaysAfterPeriodEnd: 30,
  })
  const dftReport = await category("dft_report", "DFT Report", "REPORT", {
    reportKind: "AFTER_STATUS", reportTriggerStatusId: statuses.Approved.id, reportDueDays: 30,
  })

  const attach = (parentCategoryId: number, reportCategoryId: number) =>
    prisma.reportRule.create({ data: { parentCategoryId, reportCategoryId } })
  await attach(grantFunding.id, narrativeReport.id)
  await attach(grantFunding.id, financeReport.id)
  const dftLink = await attach(dftApplication.id, dftReport.id)

  // Form templates ------------------------------------------------------------
  const template = (
    name: string,
    file: string,
    formCategoryId: number | null,
    roles: typeof APPLICATION_ROLES,
    extra: { templateType?: "APPLICATION" | "REPORT"; active?: boolean; createdAt?: Date } = {},
  ) =>
    prisma.formTemplate.create({
      data: { name, description: `${name} form template`, form: templateForm(file, name), formCategoryId, ...roles, ...extra },
    })
  const grant2026 = await template("Grant Funding Application 2026", "grant-funding-application.json", grantFunding.id, APPLICATION_ROLES, { createdAt: day("2026-01-01") })
  await template("Grant Funding Application 2027", "grant-funding-application-2027.json", grantFunding.id, APPLICATION_ROLES)
  const dft = await template("DFT Application", "dft-application.json", dftApplication.id, APPLICATION_ROLES)
  // Same form, but its DFT Report is created on submission instead of approval
  const dftOnSubmission = await template("DFT Application (report on submission)", "dft-application.json", dftApplication.id, APPLICATION_ROLES)
  await template("FRIS Application", "fris-application.json", frisApplication.id, APPLICATION_ROLES)
  await template("FRIS Claim", "fris-claim.json", frisClaim.id, APPLICATION_ROLES)
  await template("Narrative Report", "narrative-report.json", narrativeReport.id, REPORT_ROLES, { templateType: "REPORT" })
  await template("Finance Report", "finance-report.json", financeReport.id, REPORT_ROLES, { templateType: "REPORT" })
  await template("DFT Report", "dft-report.json", dftReport.id, REPORT_ROLES, { templateType: "REPORT" })
  await template("Field Visit Report (SCAT PO)", "field-visit-report.json", null, STAFF_ONLY_ROLES, { templateType: "REPORT" })

  await prisma.reportRuleOverride.create({
    data: { reportRuleId: dftLink.id, formTemplateId: dftOnSubmission.id, triggerStatusId: statuses.UnderReview.id },
  })

  // Example forms -------------------------------------------------------------
  // Created like the app does: grouped under their primary form, reports planned,
  // and the reports that are already due created for their status.
  async function form(data: {
    lda: { id: number }
    template: { id: number; name: string }
    status: keyof typeof statuses
    start: string
    end: string
    amount?: number
    by: { id: number }
  }) {
    const approved = data.status === "Approved" || data.status === "Underway"
    const submitted = approved || data.status === "UnderReview"
    const record = await prisma.localDevelopmentAgencyForm.create({
      data: {
        localDevelopmentAgencyId: data.lda.id,
        formTemplateId: data.template.id,
        formStatusId: statuses[data.status].id,
        formData: {},
        title: data.template.name,
        amount: data.amount ?? 0,
        fundingStart: day(data.start),
        fundingEnd: day(data.end),
        createdById: data.by.id,
        ...(submitted && { submitted: day(data.start) }),
        ...(approved && { approved: day(data.start), approvedById: officer.id }),
      },
    })
    await placeForm(record.id)
    await planReports(record.id)
    const { created } = await applyStatusReports(record.id, TODAY)
    console.log(`  ${data.lda === zanoncedo ? "Zanoncedo" : data.lda === interchurch ? "Interchurch" : "Otsile"} · ${data.template.name} (${data.status})${created.length ? ` → created ${created.map((r) => r.title).join(", ")}` : ""}`)
    return record
  }

  console.log("Creating example forms…")
  // Approved grant: its quarterly Narrative and half-yearly Finance reports that have opened are created
  await form({ lda: zanoncedo, template: grant2026, status: "Approved", start: "2026-04-01", end: "2027-03-31", amount: 250000, by: member })
  // Approved DFT application under it: DFT Report created on approval
  await form({ lda: zanoncedo, template: dft, status: "Approved", start: "2026-06-01", end: "2026-11-30", amount: 40000, by: member })
  // Submitted grant: reports planned, none created until it's approved
  await form({ lda: interchurch, template: grant2026, status: "UnderReview", start: "2026-04-01", end: "2027-03-31", amount: 180000, by: officer })
  // DFT application whose template creates the DFT Report on submission
  await form({ lda: interchurch, template: dftOnSubmission, status: "UnderReview", start: "2026-07-01", end: "2026-12-31", amount: 25000, by: officer })
  // Draft grant: reports planned only
  await form({ lda: otsile, template: grant2026, status: "Draft", start: "2027-01-01", end: "2027-12-31", by: admin })

  // Media and documents (uploaded to ImageKit when it's configured) -----------
  const uploads: Array<{ kind: "media" | "document"; file: string; title: string; description: string; mediaType?: "PHOTOGRAPH" | "GRAPHIC" }> = [
    { kind: "media", file: "db/seed/media/cdra_legacy.jpg", title: "The CDRA Legacy", description: "SCAT has been gifted CDRA House at 52-54 Francis Street in Woodstock, Cape Town." },
    { kind: "media", file: "db/seed/media/community_mapping.jpg", title: "Community Mapping", description: "Sharing a way to do community mapping.", mediaType: "PHOTOGRAPH" },
    { kind: "media", file: "db/seed/media/the_basic_income_grant_campaign.jpg", title: "The Basic Income Grant Campaign", description: "Engaging government about the socio-economic situation of citizens with little or no income.", mediaType: "GRAPHIC" },
    { kind: "document", file: "db/seed/documents/Chairpersons-Report-2021_v4_20June.pdf", title: "Chairperson's Report", description: "Notice of the SCAT Annual General Meeting." },
  ]
  let uploaded = 0
  for (const item of uploads) {
    const filePath = await uploadFile(item.file)
    if (!filePath) continue
    uploaded++
    if (item.kind === "media") {
      await prisma.media.create({
        data: { title: item.title, description: item.description, filePath, localDevelopmentAgencyId: zanoncedo.id, ...(item.mediaType && { mediaType: item.mediaType }) },
      })
    } else {
      await prisma.document.create({
        data: { title: item.title, description: item.description, filePath, localDevelopmentAgencyId: zanoncedo.id, documentType: "DOC" },
      })
    }
  }
  if (uploaded < uploads.length) console.log(`  Media/documents: ${uploaded} of ${uploads.length} uploaded (ImageKit not configured or unreachable)`)

  const planned = await prisma.plannedReport.groupBy({ by: ["status"], _count: true })
  console.log(`\nSeeded. Planned reports: ${planned.map((p) => `${p._count} ${p.status.toLowerCase()}`).join(", ")}`)
  console.log(`Sign in with super@test.test, nala@test.test (admin), sihle@test.test (programme officer) or constance@test.test (LDA member); password ${PASSWORD}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
