import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      avatar?: string | null;
      ldaIds: number[];
    } & DefaultSession["user"];
  }

  interface JWT {
    id: string;
    role: string;
    avatar?: string | null;
    ldaIds: number[];
  }

  interface User extends DefaultUser {
    id: number;
    role: string;
    avatar?: string | null;
    localDevelopmentAgencies?: Array<{ id: number }>;
  }
}
