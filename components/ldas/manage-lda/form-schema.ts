import { z } from "zod"

export const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  about: z.string().min(2, { message: "About must be at least 2 characters." }),
  fundingStatusId: z.coerce.number({ required_error: "Please select a funding status." }),
  locationId: z.coerce.number({ required_error: "Please select a location." }),
  programmeOfficerId: z.coerce.number({ required_error: "Please select a programme officer." }),
  developmentStageId: z.coerce.number({ required_error: "Please select a development stage." }),
  amount: z.coerce.number({ required_error: "Please enter an amount." }),
  totalFundingRounds: z.coerce.number({ required_error: "Please enter total funding rounds." }),
  focusAreas: z.array(z.number()).min(1, { message: "Please select at least one focus area." }),
  funds: z.array(z.number()).min(1, { message: "Please select at least one fund." }),
  fundingStart: z.date({ required_error: "Please select a funding start." }).refine(date => date !== undefined, {
    message: "Funding start is required."
  }),
  fundingEnd: z.date({ required_error: "Please select a funding end." }).refine(date => date !== undefined, {
    message: "Funding end is required."
  }),
})

export type FormValues = z.infer<typeof FormSchema>
