import { z } from "zod"
import { RegistrationStatus } from "@/constants/lda";

export const FormSchema = z.object({
  // Admin tab fields
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  about: z.string().optional(),
  registrationStatus: z.enum(RegistrationStatus).optional(),
  registrationCode: z.string().optional(),
  registrationDate: z.date().optional(),
  focusAreas: z.array(z.number()).optional(),
  developmentStageId: z.coerce.number().optional(),
  programmeOfficerId: z.coerce.number().optional(),
  status: z.string().optional(),
  
  // Details tab fields
  // Office contact details
  officeContactNumber: z.string().optional(),
  officeEmail: z.string().optional(),
  organisationWebsite: z.string().optional(),
  
  // Physical address
  physicalStreet: z.string().min(2, { message: "Street must be at least 2 characters." }),
  physicalComplexName: z.string().optional(),
  physicalComplexNumber: z.string().optional(),
  physicalCity: z.string().min(2, { message: "City must be at least 2 characters." }),
  physicalPostalCode: z.string().optional(),
  physicalProvince: z.string().min(1, { message: "Province is required." }),
  physicalDistrict: z.string().min(1, { message: "District is required." }),
  
  // Postal address
  useDifferentPostalAddress: z.boolean().default(false),
  postalStreet: z.string().optional(),
  postalComplexName: z.string().optional(),
  postalComplexNumber: z.string().optional(),
  postalCity: z.string().optional(),
  postalDistrict: z.string().optional(),
  postalProvince: z.string().optional(),
  
  // Mapped location
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapAddress: z.string().optional(),
  
  // Operations tab fields
  
  // Staff & Board tab fields - placeholder for future features
  
  // User Access tab fields - placeholder for future features
})

export type FormValues = z.infer<typeof FormSchema>
