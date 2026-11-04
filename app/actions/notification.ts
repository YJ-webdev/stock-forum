"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_ACTION_LABELS } from "@/lib/data/translations";

const NON_DELETABLE_NOTIFICATION_TYPES = [
  "PREDICTION_WON",
  "PREDICTION_LOST",
  "PREDICTION_DRAW",
  "PREDICTION_VOID",
  "PREDICTION_PENDING",
  "FEEDBACK_RECEIVED",
] as const;

const NOTIFICATION_RETENTION_DAYS = 30;
const NOTIFICATION_LIMIT = 30;

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

export async function getNotifications() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return [];
  }

  const cutoff = new Date(
    Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.notification.deleteMany({
    where: {
      userId,
      createdAt: {
        lt: cutoff,
      },
    },
  });

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: NOTIFICATION_LIMIT,
    select: {
      id: true,
      type: true,
      title: true,
      tier: true,
      message: true,
      readAt: true,
      createdAt: true,

      actor: {
        select: {
          name: true,
        },
      },

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

      replyId: true,
      reply: {
        select: {
          content: true,
          comment: {
            select: {
              id: true,
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

      prediction: {
        select: {
          symbol: true,
          pointsBet: true,
          referenceClose: true,
          settlementClose: true,
        },
      },
    },
  });

  return notifications.map((notification) => ({
    ...notification,
    prediction: notification.prediction
      ? {
          ...notification.prediction,
          referenceClose: Number(notification.prediction.referenceClose),
          settlementClose:
            notification.prediction.settlementClose === null
              ? null
              : Number(notification.prediction.settlementClose),
        }
      : null,
  }));
}

export type MyNotification = Awaited<
  ReturnType<typeof getNotifications>
>[number];

export type NotificationItem = MyNotification;

export async function markNotificationAsRead(notificationId: string) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
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

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
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

// Keep the existing export name for panel compatibility.
// Prediction and feedback notifications cannot be manually deleted.
export async function deleteSocialNotification(notificationId: string) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (typeof notificationId !== "string" || !notificationId.trim()) {
    throw new Error("Invalid notification.");
  }

  await prisma.notification.deleteMany({
    where: {
      id: notificationId.trim(),
      userId: session.user.id,
      type: {
        notIn: [...NON_DELETABLE_NOTIFICATION_TYPES],
      },
    },
  });

  return {
    success: true,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
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
