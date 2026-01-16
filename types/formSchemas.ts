import { z } from "zod"
export const RoleEnum = z.enum(["USER", "PROGRAMME_OFFICER", "ADMIN", "SUPER_USER"])
export const MediaTypeEnum = z.enum(["PHOTOGRAPH", "GRAPHIC"])
export const DocumentTypeEnum = z.enum(["DOC", "SPREADSHEET"])

export const UserFormSchema = (isNewUser: boolean, sendSetPasswordEmail: boolean = false) =>
  z
    .object({
      name: z.string().min(2, { message: "Name must be at least 2 characters." }),
      email: z.string().min(1, { message: "Please provide an email." }).email("This is not a valid email."),
      password: z.string().optional(),
      passwordConfirm: z.string().optional(),
      approved: z.boolean(),
      role: RoleEnum,
      ldaId: z.string().optional()
    })
    .superRefine((data, ctx) => {
      const requirePassword = isNewUser && !sendSetPasswordEmail
      
      if (requirePassword && (!data.password || data.password.length < 8)) {
        ctx.addIssue({
          path: ["password"],
          message: "Password must be at least 8 characters long",
          code: "custom",
        })
      }
      if (requirePassword && data.password !== data.passwordConfirm) {
        ctx.addIssue({
          path: ["passwordConfirm"],
          message: "Passwords must match",
          code: "custom",
        })
      }
      if (!isNewUser && data.password && data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
          path: ["password"],
          message: "Password must be at least 8 characters long",
          code: "custom",
        })
      }
      if (!isNewUser && data.password && data.password !== data.passwordConfirm) {
        ctx.addIssue({
          path: ["passwordConfirm"],
          message: "Passwords must match",
          code: "custom",
        })
      }
    })
