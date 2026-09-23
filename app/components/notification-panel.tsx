"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type MyNotification,
} from "@/app/actions/notification";

// -----------------------------------------------------------------------------
// NOTIFICATION PANEL
// -----------------------------------------------------------------------------

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<MyNotification[]>([]);

  const [loading, setLoading] = useState(true);

  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const result = await getMyNotifications();

        if (!cancelled) {
          setNotifications(result);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // MARK ONE READ
  // ---------------------------------------------------------------------------

  const handleNotificationClick = (notificationId: string) => {
    const notification = notifications.find(
      (item) => item.id === notificationId,
    );

    if (!notification || notification.readAt) {
      return;
    }

    // Optimistic UI update.
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              readAt: new Date(),
            }
          : item,
      ),
    );

    startTransition(async () => {
      try {
        await markNotificationAsRead(notificationId);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);

        // Reload authoritative state if it failed.
        const result = await getMyNotifications();

        setNotifications(result);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // MARK ALL READ
  // ---------------------------------------------------------------------------

  const handleMarkAllRead = () => {
    const hasUnread = notifications.some(
      (notification) => !notification.readAt,
    );

    if (!hasUnread) {
      return;
    }

    const now = new Date();

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? now,
      })),
    );

    startTransition(async () => {
      try {
        await markAllNotificationsAsRead();
      } catch (error) {
        console.error("Failed to mark all notifications as read:", error);

        const result = await getMyNotifications();

        setNotifications(result);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col pt-4">
      {/* Header */}

      <div
        className="
          flex items-center justify-between
          border-b border-zinc-200
          px-4 py-3
          dark:border-zinc-800
        "
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />

          <span className="text-sm font-semibold">Notifications</span>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleMarkAllRead}
          className="
            flex cursor-pointer items-center gap-1.5
            text-xs text-zinc-500
            transition-colors
            hover:text-zinc-900
            disabled:cursor-default
            disabled:opacity-50
            dark:text-zinc-400
            dark:hover:text-zinc-100
          "
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      </div>

      {/* Content */}

      <div className="min-h-[calc(100vh-8rem)] flex-1 overflow-y-auto">
        {loading ? (
          <NotificationSkeleton />
        ) : notifications.length === 0 ? (
          <EmptyNotifications />
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ITEM
// -----------------------------------------------------------------------------

function NotificationItem({
  notification,
  onClick,
}: {
  notification: MyNotification;
  onClick: () => void;
}) {
  const unread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative
        flex w-full cursor-pointer
        gap-3
        border-b border-zinc-100
        px-4 py-3
        text-left
        transition-colors
        hover:bg-zinc-50
        dark:border-zinc-800
        dark:hover:bg-zinc-900

        ${unread ? "bg-zinc-50/80 dark:bg-zinc-900/60" : ""}
      `}
    >
      {/* Icon */}

      <div className="mt-0.5 shrink-0">
        <NotificationIcon type={notification.type} />
      </div>

      {/* Body */}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={`
              min-w-0 flex-1
              text-sm
              ${unread ? "font-semibold" : "font-medium"}
            `}
          >
            {notification.title}
          </p>

          {unread && (
            <span
              className="
                mt-1.5
                h-2 w-2 shrink-0
                rounded-full
                bg-blue-500
              "
            />
          )}
        </div>

        <p
          className="
            mt-1
            text-sm leading-5
            text-zinc-500
            dark:text-zinc-400
          "
        >
          {notification.message}
        </p>

        <p
          className="
            mt-1.5
            text-xs
            text-zinc-400
            dark:text-zinc-500
          "
        >
          {formatNotificationTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// ICON
// -----------------------------------------------------------------------------

function NotificationIcon({ type }: { type: MyNotification["type"] }) {
  switch (type) {
    case "PREDICTION_WON":
      return (
        <TrendingUp
          className="
            h-5 w-5
            text-emerald-600
          "
        />
      );

    case "PREDICTION_LOST":
      return (
        <TrendingDown
          className="
            h-5 w-5
            text-rose-600
          "
        />
      );

    case "PREDICTION_DRAW":
      return (
        <CircleAlert
          className="
            h-5 w-5
            text-zinc-500
          "
        />
      );

    case "PREDICTION_PENDING":
      return (
        <CircleAlert
          className="
            h-5 w-5
            text-amber-500
          "
        />
      );

    case "PREDICTION_VOID":
      return (
        <CircleAlert
          className="
            h-5 w-5
            text-zinc-500
          "
        />
      );

    default:
      return (
        <Bell
          className="
            h-5 w-5
            text-zinc-500
          "
        />
      );
  }
}

// -----------------------------------------------------------------------------
// EMPTY
// -----------------------------------------------------------------------------

function EmptyNotifications() {
  return (
    <div
      className="
        flex min-h-[calc(100vh-8rem)]
        flex-col items-center justify-center
        px-6 text-center
      "
    >
      <Bell
        className="
          mb-3
          h-6 w-6
          text-zinc-300
          dark:text-zinc-700
        "
      />

      <p className="text-sm font-medium">No notifications</p>

      <p
        className="
          mt-1
          text-sm text-zinc-500
          dark:text-zinc-400
        "
      >
        Your prediction results will appear here.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SKELETON
// -----------------------------------------------------------------------------

function NotificationSkeleton() {
  return (
    <div className="space-y-1 p-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="
            flex gap-3 py-3
          "
        >
          <div
            className="
              h-5 w-5 shrink-0
              animate-pulse rounded-full
              bg-zinc-200
              dark:bg-zinc-800
            "
          />

          <div className="flex-1 space-y-2">
            <div
              className="
                h-3 w-28
                animate-pulse rounded
                bg-zinc-200
                dark:bg-zinc-800
              "
            />

            <div
              className="
                h-3 w-full
                animate-pulse rounded
                bg-zinc-200
                dark:bg-zinc-800
              "
            />

            <div
              className="
                h-3 w-16
                animate-pulse rounded
                bg-zinc-200
                dark:bg-zinc-800
              "
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TIME
// -----------------------------------------------------------------------------

function formatNotificationTime(date: Date) {
  const value = new Date(date);

  const diff = Date.now() - value.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {
    return `${Math.floor(diff / minute)}m ago`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)}h ago`;
  }

  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}d ago`;
  }

  return value.toLocaleDateString();
}
