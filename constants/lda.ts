// Configurable LDA terminology via environment variables
// Defaults: LDAs (short plural), LDA (short singular), Local Development Agency (full name)
export const LDA_TERMINOLOGY = {
  shortNamePlural: process.env.NEXT_PUBLIC_LDA_SHORT_NAME_PLURAL || "LDAs",
  shortName: process.env.NEXT_PUBLIC_LDA_SHORT_NAME || "LDA",
  fullName: process.env.NEXT_PUBLIC_LDA_FULL_NAME || "Local Development Agency",
  fullNamePlural: process.env.NEXT_PUBLIC_LDA_FULL_NAME_PLURAL || "Local Development Agencies",
  // Common phrases
  get fundedLabel() { return `Funded ${this.shortNamePlural}` },
  get linkLabel() { return `Link ${this.shortName}` },
  get linkToFundLabel() { return `Link ${this.shortName} to fund` },
  get selectPlaceholder() { return `Select ${this.shortName === "LDA" ? "an" : "a"} ${this.shortName}` },
  get linkedSuccess() { return `${this.shortName} linked successfully` },
  get linkError() { return `Failed to link ${this.shortName} to fund` },
  get nameLabel() { return `${this.shortName} Name` },
  get userRole() { return `${this.shortName} User` },
  get fundingPerMonth() { return `${this.shortName} funding per month` },
  get defaultAmountLabel() { return `Default amount (per ${this.shortName})` },
  get addLabel() { return `Add ${this.shortName}` },
  get manageLabel() { return `Manage ${this.shortName}` },
  get createLabel() { return `Create ${this.shortName}` },
  get filterPlaceholder() { return `Filter ${this.shortNamePlural}...` },
  get updatingMessage() { return `Updating ${this.shortName}...` },
  get creatingMessage() { return `Creating new ${this.shortName}...` },
  get updatedSuccess() { return `${this.shortName} updated successfully` },
  get createdSuccess() { return `${this.shortName} created successfully` },
  get updateError() { return `Failed to update ${this.shortName}` },
  get createError() { return `Failed to create ${this.shortName}` },
  // URL path for LDA pages (used in links)
  urlPath: process.env.NEXT_PUBLIC_LDA_URL_PATH || "ldas",
  get dashboardPath() { return `/dashboard/${this.urlPath}` },
} as const

export const RegistrationStatus = {
    not_registered: "Not registered",
    registered_npo: "Registered NPO",
    registered_bpo: "Registered BPO"
} as const;

export const OrganisationStatus = {
    active: "Active",
    inactive: "Inactive",
    archived: "Archived"
} as const;