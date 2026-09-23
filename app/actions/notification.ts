"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

      // -----------------------------------------------------------------------
      // ACTOR
      // -----------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// UNREAD COUNT
// -----------------------------------------------------------------------------

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

  return {
    success: true,
  };
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

  return {
    success: true,
  };
}

// -----------------------------------------------------------------------------
// TYPE
// -----------------------------------------------------------------------------

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
