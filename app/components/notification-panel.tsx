"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Bell,
  CheckCheck,
  CircleAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  deleteAllSocialNotifications,
  deleteSocialNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type MyNotification,
} from "@/app/actions/notification";
import { RiHeartFill } from "react-icons/ri";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface NotificationPanelProps {
  refreshKey: number;
}

const SOCIAL_TYPES = new Set<MyNotification["type"]>([
  "COMMENT_LIKED",
  "REPLY_LIKED",
  "COMMENT_REPLIED",
  "REPLY_REPLIED",
]);

// -----------------------------------------------------------------------------
// NOTIFICATION PANEL
// -----------------------------------------------------------------------------

export function NotificationPanel({ refreshKey }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<MyNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const result = await getNotifications();

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
  }, [refreshKey]);

  // ---------------------------------------------------------------------------
  // CLICK NOTIFICATION
  // ---------------------------------------------------------------------------

  const handleNotificationClick = (notification: MyNotification) => {
    const href = getNotificationHref(notification);

    // Optimistically mark as read.
    if (!notification.readAt) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                readAt: new Date(),
              }
            : item,
        ),
      );

      startTransition(async () => {
        try {
          await markNotificationAsRead(notification.id);
        } catch (error) {
          console.error("Failed to mark notification as read:", error);

          const result = await getNotifications();
          setNotifications(result);
        }
      });
    }

    if (href) {
      router.push(href);
    }
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

        const result = await getNotifications();
        setNotifications(result);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // DELETE ONE SOCIAL NOTIFICATION
  // ---------------------------------------------------------------------------

  const handleDeleteNotification = (notificationId: string) => {
    const previousNotifications = notifications;

    // Optimistic removal.
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );

    startTransition(async () => {
      try {
        await deleteSocialNotification(notificationId);
      } catch (error) {
        console.error("Failed to delete notification:", error);

        // Restore if deletion failed.
        setNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // DELETE ALL SOCIAL NOTIFICATIONS
  // ---------------------------------------------------------------------------

  const handleDeleteAllSocial = () => {
    const hasSocialNotifications = notifications.some((notification) =>
      SOCIAL_TYPES.has(notification.type),
    );

    if (!hasSocialNotifications) {
      return;
    }

    const previousNotifications = notifications;

    // Immediately remove social notifications from UI.
    setNotifications((current) =>
      current.filter((notification) => !SOCIAL_TYPES.has(notification.type)),
    );

    startTransition(async () => {
      try {
        await deleteAllSocialNotifications();
      } catch (error) {
        console.error("Failed to delete social notifications:", error);

        setNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const hasSocialNotifications = notifications.some((notification) =>
    SOCIAL_TYPES.has(notification.type),
  );

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

        <div className="flex items-center gap-3">
          {/* Mark all read */}

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

          {/* Clear social notifications */}

          {hasSocialNotifications && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteAllSocial}
              className="
                flex cursor-pointer items-center gap-1.5
                text-xs text-zinc-500
                transition-colors
                hover:text-rose-600
                disabled:cursor-default
                disabled:opacity-50
                dark:text-zinc-400
                dark:hover:text-rose-400
              "
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
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
              onClick={() => handleNotificationClick(notification)}
              onDelete={() => handleDeleteNotification(notification.id)}
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
  onDelete,
}: {
  notification: MyNotification;
  onClick: () => void;
  onDelete: () => void;
}) {
  const unread = notification.readAt === null;

  const isSocial = SOCIAL_TYPES.has(notification.type);

  const preview = getNotificationPreview(notification);

  return (
    <div
      className={`
        group relative
        flex w-full
        border-b border-zinc-100
        transition-colors
        hover:bg-zinc-50
        dark:border-zinc-800
        dark:hover:bg-zinc-900

        ${unread ? "bg-zinc-50/80 dark:bg-zinc-900/60" : ""}
      `}
    >
      {/* Main clickable area */}

      <button
        type="button"
        onClick={onClick}
        className="
          flex min-w-0 flex-1
          cursor-pointer gap-3
          px-4 py-3
          pr-10
          text-left
        "
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

          {/* Notification message */}

          <div
            className="
    mt-1
    flex items-center gap-1.5
    text-sm leading-5
    text-zinc-500
    dark:text-zinc-400
  "
          >
            <span>{notification.message}</span>

            {(notification.type === "COMMENT_LIKED" ||
              notification.type === "REPLY_LIKED") && (
              <RiHeartFill className="size-4 shrink-0" />
            )}
          </div>

          {/* Comment / reply preview */}

          {preview && (
            <p
              className="
                mt-1
                truncate
                text-sm
                text-zinc-400
                dark:text-zinc-500
              "
            >
              “{preview}”
            </p>
          )}

          {/* Time */}

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

      {/* Delete social notification */}

      {isSocial && (
        <button
          type="button"
          aria-label="Delete notification"
          title="Delete notification"
          disabled={false}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            onDelete();
          }}
          className="
            absolute top-3 right-3
            flex h-7 w-7
            cursor-pointer items-center justify-center
            rounded-md
            text-zinc-400
            opacity-0
            transition
            hover:bg-zinc-200
            hover:text-rose-600
            group-hover:opacity-100
            focus:opacity-100
            dark:hover:bg-zinc-800
            dark:hover:text-rose-400
          "
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// NOTIFICATION PREVIEW
// -----------------------------------------------------------------------------

function getNotificationPreview(notification: MyNotification): string | null {
  switch (notification.type) {
    case "COMMENT_LIKED":
      return getContentText(notification.comment?.content);

    case "REPLY_LIKED":
    case "COMMENT_REPLIED":
    case "REPLY_REPLIED":
      return getContentText(notification.reply?.content);

    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// CONTENT -> TEXT
// -----------------------------------------------------------------------------

function getContentText(content: unknown): string | null {
  if (!content) {
    return null;
  }

  // Reply content may simply be a string.
  if (typeof content === "string") {
    const value = content.trim();

    return value || null;
  }

  // TipTap JSON.
  if (typeof content === "object") {
    const text = extractTextFromTipTap(content);

    return text.trim() || null;
  }

  return null;
}

function extractTextFromTipTap(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const node = value as {
    type?: string;
    text?: string;
    content?: unknown[];
  };

  if (node.type === "text") {
    return node.text ?? "";
  }

  if (!Array.isArray(node.content)) {
    return "";
  }

  return node.content.map((child) => extractTextFromTipTap(child)).join(" ");
}

// -----------------------------------------------------------------------------
// NAVIGATION
// -----------------------------------------------------------------------------

function getNotificationHref(notification: MyNotification): string | null {
  switch (notification.type) {
    case "COMMENT_LIKED": {
      const symbol = notification.comment?.assets[0]?.asset.symbol;

      if (!symbol || !notification.commentId) {
        return null;
      }

      return `/${encodeURIComponent(
        symbol,
      )}?comment=${encodeURIComponent(notification.commentId)}`;
    }

    case "REPLY_LIKED":
    case "COMMENT_REPLIED":
    case "REPLY_REPLIED": {
      const symbol = notification.reply?.comment.assets[0]?.asset.symbol;

      if (!symbol || !notification.replyId) {
        return null;
      }

      return `/${encodeURIComponent(
        symbol,
      )}?reply=${encodeURIComponent(notification.replyId)}`;
    }

    case "PREDICTION_WON":
    case "PREDICTION_LOST":
    case "PREDICTION_DRAW":
    case "PREDICTION_VOID":
    case "PREDICTION_PENDING": {
      const symbol = notification.prediction?.symbol;

      if (!symbol) {
        return null;
      }

      return `/${encodeURIComponent(symbol)}`;
    }

    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// ICON
// -----------------------------------------------------------------------------

function NotificationIcon({ type }: { type: MyNotification["type"] }) {
  switch (type) {
    case "PREDICTION_WON":
      return <TrendingUp className="h-5 w-5 text-emerald-600" />;

    case "PREDICTION_LOST":
      return <TrendingDown className="h-5 w-5 text-rose-600" />;

    case "PREDICTION_DRAW":
      return <CircleAlert className="h-5 w-5 text-zinc-500" />;

    case "PREDICTION_PENDING":
      return <CircleAlert className="h-5 w-5 text-amber-500" />;

    case "PREDICTION_VOID":
      return <CircleAlert className="h-5 w-5 text-zinc-500" />;

    default:
      return <Bell className="h-5 w-5 text-zinc-500" />;
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
        New activity and prediction results will appear here.
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
        <div key={item} className="flex gap-3 py-3">
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
                h-3 w-3/4
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
