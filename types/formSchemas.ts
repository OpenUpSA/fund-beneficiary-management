import { z } from "zod"
export const RoleEnum = z.enum(["USER", "PROGRAMME_OFFICER", "ADMIN"])

export const UserFormSchema = (requirePassword: boolean) =>
  z
    .object({
      name: z.string().min(2, { message: "Name must be at least 2 characters." }),
      email: z.string().min(1, { message: "Please provide an email." }).email("This is not a valid email."),
      password: requirePassword
        ? z.string().min(8, "Password must be at least 8 characters long")
        : z.string().optional(),
      passwordConfirm: requirePassword ? z.string() : z.string().optional(),
      approved: z.boolean(),
      role: RoleEnum
    })
    .superRefine((data, ctx) => {
      if (requirePassword && !data.password) {
        ctx.addIssue({
          path: ["password"],
          message: "Password is required",
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
    })
