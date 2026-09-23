"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getUnreadNotificationCount() {
  const session = await auth();

  if (!session?.user?.id) {
    return 0;
  }

  return prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });
}

const SOCIAL_NOTIFICATION_TYPES = [
  "COMMENT_LIKED",
  "REPLY_LIKED",
  "COMMENT_REPLIED",
  "REPLY_REPLIED",
] as const;

export async function getNotifications() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  return prisma.notification.findMany({
    where: {
      userId: session.user.id,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 50,

    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      readAt: true,
      createdAt: true,

      actorId: true,

      actor: {
        select: {
          id: true,
          name: true,
          image: true,
          nationality: true,
        },
      },

      // -----------------------------------------------------------------------
      // COMMENT
      // -----------------------------------------------------------------------

      commentId: true,

      comment: {
        select: {
          id: true,

          // Important: needed for notification preview.
          content: true,

          assets: {
            select: {
              asset: {
                select: {
                  symbol: true,
                  displaySymbol: true,
                  name: true,
                },
              },
            },
          },
        },
      },

      // -----------------------------------------------------------------------
      // REPLY
      // -----------------------------------------------------------------------

      replyId: true,

      reply: {
        select: {
          id: true,
          commentId: true,

          // Important: needed for notification preview.
          content: true,

          comment: {
            select: {
              assets: {
                select: {
                  asset: {
                    select: {
                      symbol: true,
                      displaySymbol: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      // -----------------------------------------------------------------------
      // PREDICTION
      // -----------------------------------------------------------------------

      predictionId: true,

      prediction: {
        select: {
          symbol: true,
          direction: true,
          pointsBet: true,
          referenceClose: true,
          settlementClose: true,
          status: true,
        },
      },
    },
  });
}

export type MyNotification = Awaited<
  ReturnType<typeof getNotifications>
>[number];

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

  return Boolean(notification);
}

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

export async function deleteSocialNotification(notificationId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  await prisma.notification.deleteMany({
    where: {
      id: notificationId,

      // Security: user can only delete their own notification.
      userId: session.user.id,

      // Do not allow this action to delete prediction notifications.
      type: {
        in: [...SOCIAL_NOTIFICATION_TYPES],
      },
    },
  });
}

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
