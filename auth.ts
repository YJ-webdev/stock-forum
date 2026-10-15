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
import { getChatBanIdentityHash } from "@/lib/moderation/chat-ban-identity";

interface LoginIdentity {
  provider: string;
  providerAccountId: string;
}

// Apply an existing chat ban and record all linked login identities.
async function syncChatBan(userId: string, incomingIdentity: LoginIdentity) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${userId}
      FOR UPDATE
    `;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        bannedAt: true,
        deletedAt: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new Error("Account unavailable.");
    }

    const identityHashes = [
      ...new Set(
        [...user.accounts, incomingIdentity].map((account) =>
          getChatBanIdentityHash(account.provider, account.providerAccountId),
        ),
      ),
    ];

    const existingBans = await tx.chatBanIdentity.findMany({
      where: {
        identityHash: { in: identityHashes },
      },
      select: {
        userId: true,
      },
    });

    if (user.status !== "BANNED" && existingBans.length === 0) {
      return;
    }

    const previousOwnerIds = [
      ...new Set(existingBans.map((ban) => ban.userId)),
    ].filter((id) => id !== userId);

    // Transfer the previous ban's identities to the new account.
    // This allows unbanUser(newUserId) to remove the whole ban.
    if (previousOwnerIds.length > 0) {
      await tx.chatBanIdentity.updateMany({
        where: {
          userId: { in: previousOwnerIds },
        },
        data: {
          userId,
        },
      });
    }

    // Include newly linked providers in the same ban.
    for (const identityHash of identityHashes) {
      await tx.chatBanIdentity.upsert({
        where: { identityHash },
        update: { userId },
        create: {
          identityHash,
          userId,
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        status: "BANNED",
        bannedAt: user.bannedAt ?? new Date(),
        mutedAt: null,
      },
    });
  });
}

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
      if (!user.id) return;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      });
    },

    async linkAccount({ user, account }) {
      if (!user.id) return;

      await syncChatBan(user.id, {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      });
    },
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.sub = user.id;
      }

      if (!token.sub) {
        return null;
      }

      // Runs on OAuth sign-in after the database user is available.
      // Also rechecks the ban before issuing the login token.
      if (account) {
        await syncChatBan(token.sub, {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          name: true,
          email: true,
          image: true,
          role: true,
          status: true,
          nationality: true,
          language: true,
          deletedAt: true,
        },
      });

      // Invalidate stale JWTs for deleted or missing accounts.
      if (!dbUser || dbUser.deletedAt) {
        return null;
      }

      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;

      token.role = dbUser.role;
      token.status = dbUser.status;
      token.nationality = dbUser.nationality ?? "";
      token.language = dbUser.language ?? "en";

      // BANNED restricts chat; it does not invalidate login.
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
          typeof token.language === "string" ? token.language : "en";
      }

      return session;
    },
  },
});
