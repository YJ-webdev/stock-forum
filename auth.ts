import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";
import Twitter from "next-auth/providers/twitter";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Apple from "next-auth/providers/apple";
import Discord from "next-auth/providers/discord";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(
    prisma as unknown as Parameters<typeof PrismaAdapter>[0],
  ),

  session: {
    strategy: "jwt",
  },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,

      allowDangerousEmailAccountLinking: true,

      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),

    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),

    Twitter({
      clientId: process.env.AUTH_TWITTER_ID,
      clientSecret: process.env.AUTH_TWITTER_SECRET,
    }),

    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: "https://login.microsoftonline.com/common/v2.0",
    }),

    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),

    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),

    ...(process.env.NODE_ENV === "development"
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
  ],

  events: {
    async createUser({ user }) {
      if (!user.id) {
        return;
      }

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerified: new Date(),
        },
      });
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: {
            id: token.sub,
          },
          select: {
            name: true,
            email: true,
            image: true,
            role: true,
            status: true,
            nationality: true,
            language: true,
          },
        });

        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;

          token.role = dbUser.role;
          token.status = dbUser.status;
          token.nationality = dbUser.nationality ?? "";
          token.language = dbUser.language ?? "";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";

        session.user.name = typeof token.name === "string" ? token.name : "";

        session.user.email = typeof token.email === "string" ? token.email : "";

        session.user.image =
          typeof token.picture === "string" ? token.picture : "";

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
