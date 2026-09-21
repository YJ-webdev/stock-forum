import { Role, UserStatus } from "@/generated/prisma";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      nationality: string;
      language: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    status?: UserStatus;
    nationality?: string;
    language?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    status?: UserStatus;
    nationality?: string;
    language?: string;
  }
}
