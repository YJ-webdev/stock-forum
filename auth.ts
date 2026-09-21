import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(
    prisma as unknown as Parameters<typeof PrismaAdapter>[0],
  ),
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
  callbacks: {
    async jwt({ token }) {
      if (!token.sub) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: {
          id: token.sub,
        },
        select: {
          role: true,
          status: true,
          nationality: true,
          language: true,
        },
      });

      if (dbUser) {
        token.role = dbUser.role;
        token.status = dbUser.status;
        token.nationality = dbUser.nationality ?? "";
        token.language = dbUser.language ?? "";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";

        session.user.role = token.role ?? "USER";
        session.user.status = token.status ?? "ACTIVE";

        session.user.nationality =
          typeof token.nationality === "string" ? token.nationality : "";

        session.user.language =
          typeof token.language === "string" ? token.language : "";
      }

      return session;
    },
  },
});
