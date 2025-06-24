export const RegistrationStatus = [
    "Not registered",
    "Registered NPO",
    "Registered BPO"
] as const;

export const OrganisationStatus = [
    "Active",
    "Inactive",
    "Archived"
] as const;



type RegistrationStatus = typeof RegistrationStatus[number];
type OrganisationStatus = typeof OrganisationStatus[number];