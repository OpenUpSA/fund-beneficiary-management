import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      ldaIds: number[];
    } & DefaultSession["user"];
  }

  interface JWT {
    id: string;
    role: string;
    ldaIds: number[];
  }

  interface User extends DefaultUser {
    id: number;
    role: string;
    localDevelopmentAgencies?: Array<{ id: number }>;
  }
}
