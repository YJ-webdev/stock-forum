"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const SOCIAL_NOTIFICATION_TYPES = [
  "COMMENT_LIKED",
  "REPLY_LIKED",
  "COMMENT_REPLIED",
  "REPLY_REPLIED",
] as const;

// -----------------------------------------------------------------------------
// HAS UNREAD NOTIFICATIONS
//
// Used by the navbar bell.
//
// We only need to know whether ONE unread notification exists.
// findFirst() is preferable to count() here because the database can stop
// as soon as it finds the first matching row.
// -----------------------------------------------------------------------------

export async function hasUnreadNotifications() {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  const notification = await prisma.notification.findFirst({
    where: {
      userId: session.user.id,
      readAt: null,
    },

    select: {
      id: true,
    },
  });

  return notification !== null;
}

// -----------------------------------------------------------------------------
// GET NOTIFICATIONS
//
// Keep this query intentionally small.
//
// The notification panel currently needs:
//
// - notification metadata
// - comment/reply content for preview
// - one market symbol for navigation
// - prediction symbol for navigation
//
// It does NOT need:
// - actor profile
// - asset name
// - asset displaySymbol
// - prediction direction
// - prediction points
// - prediction prices
// - prediction status
// -----------------------------------------------------------------------------

export async function getNotifications() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return [];
  }

  // Delete all notifications older than 30 days, including unread ones.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await prisma.notification.deleteMany({
    where: {
      userId,
      createdAt: {
        lt: cutoff,
      },
    },
  });

  return prisma.notification.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 30,

    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      readAt: true,
      createdAt: true,

      // COMMENT
      commentId: true,

      comment: {
        select: {
          content: true,

          assets: {
            take: 1,

            select: {
              asset: {
                select: {
                  symbol: true,
                },
              },
            },
          },
        },
      },

      // REPLY
      replyId: true,

      reply: {
        select: {
          content: true,

          comment: {
            select: {
              assets: {
                take: 1,

                select: {
                  asset: {
                    select: {
                      symbol: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      // PREDICTION
      prediction: {
        select: {
          symbol: true,
        },
      },
    },
  });
}

// -----------------------------------------------------------------------------
// CLIENT TYPE
// -----------------------------------------------------------------------------

export type NotificationItem = Awaited<
  ReturnType<typeof getNotifications>
>[number];

// -----------------------------------------------------------------------------
// CLIENT TYPE
// -----------------------------------------------------------------------------

export type MyNotification = Awaited<
  ReturnType<typeof getNotifications>
>[number];

// -----------------------------------------------------------------------------
// MARK ONE AS READ
// -----------------------------------------------------------------------------

export async function markNotificationAsRead(notificationId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
      readAt: null,
    },

    data: {
      readAt: new Date(),
    },
  });
}

// -----------------------------------------------------------------------------
// MARK ALL AS READ
// -----------------------------------------------------------------------------

export async function markAllNotificationsAsRead() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
    },

    data: {
      readAt: new Date(),
    },
  });
}

// -----------------------------------------------------------------------------
// DELETE ONE SOCIAL NOTIFICATION
// -----------------------------------------------------------------------------

export async function deleteSocialNotification(notificationId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId: session.user.id,

      type: {
        in: [...SOCIAL_NOTIFICATION_TYPES],
      },
    },
  });
}

// -----------------------------------------------------------------------------
// DELETE ALL SOCIAL NOTIFICATIONS
// -----------------------------------------------------------------------------

export async function deleteAllSocialNotifications() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  await prisma.notification.deleteMany({
    where: {
      userId: session.user.id,

      type: {
        in: [...SOCIAL_NOTIFICATION_TYPES],
      },
    },
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth();

  if (!session?.user?.id) return 0;

  return prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });
}
