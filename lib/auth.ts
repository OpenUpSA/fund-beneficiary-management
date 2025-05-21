import CredentialsProvider from "next-auth/providers/credentials"
import { AuthOptions } from "next-auth"
import { User } from "next-auth"
import prisma from "@/db"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { validatePassword } from "./hash"

export const NEXT_AUTH_OPTIONS: AuthOptions = {
  // @ts-expect-error: PostgreSQL JSON column
  adapter: PrismaAdapter(prisma) as Adapter,
  debug: false,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt(data) {
      const { token, trigger, user } = data

      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
        token.ldaIds = user.localDevelopmentAgencies?.map((lda: { id: number }) => lda.id) || []
      }

      if (trigger === "update" && data?.session?.updatedUser) {
        token.name = data.session.updatedUser.name
        token.role = data.session.updatedUser.role
        token.email = data.session.updatedUser.email
      }

      return token
    },
    async session(data) {
      const { session, token } = data
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.role = token.role as string
        session.user.ldaIds = token.ldaIds as number[]
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials: Record<"email" | "password", string> | undefined) {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            localDevelopmentAgencies: true
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await validatePassword(credentials.password, user.passwordHash)
        if (!isPasswordValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          localDevelopmentAgencies: user.localDevelopmentAgencies
        } as unknown as User
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
}
