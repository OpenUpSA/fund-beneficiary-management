import { z } from "zod"
import { RegistrationStatus, OrganisationStatus } from "@/constants/lda";

// Define the schema with proper types for React Hook Form compatibility
export const FormSchema = z.object({
  // Admin tab fields
  name: z.string().min(1, 'Name is required'),
  about: z.string().optional(),
  registrationStatus: z.enum(Object.keys(RegistrationStatus) as [string, ...string[]]).optional(),
  registrationCode: z.string().optional(),
  registrationDate: z.date().optional(),
  focusAreas: z.array(z.number()).optional(),
  developmentStageId: z.string().optional(),
  programmeOfficerId: z.string().optional(),
  organisationStatus: z.enum(Object.keys(OrganisationStatus) as [string, ...string[]]).optional(),
  contactNumber: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  
  // Details tab fields
  // Physical address
  physicalStreet: z.string().optional(),
  physicalComplexName: z.string().optional(),
  physicalComplexNumber: z.string().optional(),
  physicalCity: z.string().optional(),
  physicalPostalCode: z.string().optional(),
  physicalProvince: z.string().optional(),
  physicalDistrict: z.string().optional(),
  
  // Postal address
  useDifferentPostalAddress: z.boolean(),
  postalStreet: z.string().optional(),
  postalComplexName: z.string().optional(),
  postalComplexNumber: z.string().optional(),
  postalCity: z.string().optional(),
  postalCode: z.string().optional(),
  postalProvince: z.string().optional(),
  postalDistrict: z.string().optional(),
  
  // Mapped location
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapAddress: z.string().optional(),
  funds: z.array(z.number()).optional(),
})

export type FormValues = z.infer<typeof FormSchema>
