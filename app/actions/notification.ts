"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_ACTION_LABELS } from "@/lib/data/translations";

const SOCIAL_NOTIFICATION_TYPES = [
  "COMMENT_LIKED",
  "REPLY_LIKED",
  "COMMENT_REPLIED",
  "REPLY_REPLIED",
] as const;

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
    select: { id: true },
  });

  return notification !== null;
}

export async function getNotifications() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return [];
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await prisma.notification.deleteMany({
    where: {
      userId,
      createdAt: { lt: cutoff },
    },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,

    select: {
      id: true,
      type: true,
      title: true,
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
                select: { symbol: true },
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
                    select: { symbol: true },
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
    data: { readAt: new Date() },
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
    data: { readAt: new Date() },
  });
}

export async function deleteSocialNotification(notificationId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId: session.user.id,
      type: { in: [...SOCIAL_NOTIFICATION_TYPES] },
    },
  });
}

export async function deleteAllSocialNotifications() {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  await prisma.notification.deleteMany({
    where: {
      userId: session.user.id,
      type: { in: [...SOCIAL_NOTIFICATION_TYPES] },
    },
  });
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
