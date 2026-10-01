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
  X,
} from "lucide-react";

import { RiHeartFill } from "react-icons/ri";

import {
  deleteAllSocialNotifications,
  deleteSocialNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type MyNotification,
} from "@/app/actions/notification";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface NotificationPanelProps {
  refreshKey: number;
  setOnNotification: React.Dispatch<React.SetStateAction<boolean>>;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const SOCIAL_TYPES = new Set<MyNotification["type"]>([
  "COMMENT_LIKED",
  "REPLY_LIKED",
  "COMMENT_REPLIED",
  "REPLY_REPLIED",
]);

// -----------------------------------------------------------------------------
// CLIENT CACHE
//
// Keep notifications alive even when NotificationPanel unmounts.
//
// This means:
//
// First open:
//   spinner -> server -> notifications
//
// Later opens:
//   cached notifications immediately -> background refresh
//
// No loading flash when reopening the panel.
// -----------------------------------------------------------------------------

let notificationCache: MyNotification[] | null = null;

// Prevent multiple simultaneous getNotifications() requests.
let notificationRequest: Promise<MyNotification[]> | null = null;

// -----------------------------------------------------------------------------
// FETCH
// -----------------------------------------------------------------------------

function fetchNotifications() {
  if (!notificationRequest) {
    notificationRequest = getNotifications().finally(() => {
      notificationRequest = null;
    });
  }

  return notificationRequest;
}

// -----------------------------------------------------------------------------
// NOTIFICATION PANEL
// -----------------------------------------------------------------------------

export function NotificationPanel({
  refreshKey,
  setOnNotification,
}: NotificationPanelProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [notifications, setNotifications] = useState<MyNotification[]>(
    () => notificationCache ?? [],
  );

  // Only show the full loader when we have absolutely no cached data.
  const [loading, setLoading] = useState(notificationCache === null);

  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  // ---------------------------------------------------------------------------
  // LOAD
  //
  // Stale-while-revalidate:
  //
  // If cache exists:
  //   render it immediately
  //   refresh silently in background
  //
  // If cache does not exist:
  //   show loader
  //   fetch notifications
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      const hasCache = notificationCache !== null;

      if (!hasCache) {
        setLoading(true);
      }

      try {
        const result = await fetchNotifications();

        if (cancelled) {
          return;
        }

        notificationCache = result;

        setNotifications(result);
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
  // UPDATE LOCAL + CACHE
  // ---------------------------------------------------------------------------

  const updateNotifications = (
    updater: (current: MyNotification[]) => MyNotification[],
  ) => {
    setNotifications((current) => {
      const next = updater(current);

      notificationCache = next;

      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // CLICK NOTIFICATION
  //
  // Important:
  //
  // Do not wait for the database before navigating.
  //
  // 1. Update UI immediately.
  // 2. Navigate immediately.
  // 3. Persist read state in background.
  // ---------------------------------------------------------------------------

  const handleNotificationClick = (notification: MyNotification) => {
    const href = getNotificationHref(notification);

    if (!notification.readAt) {
      const now = new Date();

      updateNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                readAt: now,
              }
            : item,
        ),
      );

      // Fire the server mutation without blocking navigation.
      void markNotificationAsRead(notification.id).catch((error) => {
        console.error("Failed to mark notification as read:", error);
      });
    }

    if (href) {
      setOnNotification(false);

      router.push(href);
    }
  };

  // ---------------------------------------------------------------------------
  // MARK ALL READ
  //
  // Optimistic UI.
  //
  // No refetch after success.
  // ---------------------------------------------------------------------------

  const handleMarkAllRead = () => {
    const hasUnread = notifications.some(
      (notification) => !notification.readAt,
    );

    if (!hasUnread || isPending) {
      return;
    }

    const previousNotifications = notifications;

    const now = new Date();

    updateNotifications((current) =>
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

        notificationCache = previousNotifications;

        setNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // DELETE ONE SOCIAL NOTIFICATION
  //
  // Optimistic removal.
  //
  // No refetch.
  // ---------------------------------------------------------------------------

  const handleDeleteNotification = (notificationId: string) => {
    if (isPending) {
      return;
    }

    const previousNotifications = notifications;

    updateNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );

    startTransition(async () => {
      try {
        await deleteSocialNotification(notificationId);
      } catch (error) {
        console.error("Failed to delete notification:", error);

        notificationCache = previousNotifications;

        setNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // DELETE ALL SOCIAL NOTIFICATIONS
  //
  // Optimistic removal.
  //
  // No refetch.
  // ---------------------------------------------------------------------------

  const handleDeleteAllSocial = () => {
    if (isPending) {
      return;
    }

    const hasSocialNotifications = notifications.some((notification) =>
      SOCIAL_TYPES.has(notification.type),
    );

    if (!hasSocialNotifications) {
      return;
    }

    const previousNotifications = notifications;

    updateNotifications((current) =>
      current.filter((notification) => !SOCIAL_TYPES.has(notification.type)),
    );

    startTransition(async () => {
      try {
        await deleteAllSocialNotifications();
      } catch (error) {
        console.error("Failed to delete social notifications:", error);

        notificationCache = previousNotifications;

        setNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------

  const hasSocialNotifications = notifications.some((notification) =>
    SOCIAL_TYPES.has(notification.type),
  );

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.readAt,
  );

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full min-h-0 flex-col">
      {loading ? (
        <NotificationLoader />
      ) : (
        <>
          {/* ------------------------------------------------------------------- */}
          {/* HEADER                                                              */}
          {/* ------------------------------------------------------------------- */}

          <div
            className="
            flex shrink-0 items-center justify-between
            px-4 py-3
           
          "
          >
            <div className="flex items-center gap-3 ml-auto">
              {/* Mark all read */}

              {hasUnreadNotifications && (
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
              )}

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

              {/* Close */}

              <button
                type="button"
                onClick={() => setOnNotification(false)}
                aria-label="Close notifications"
                title="Close notifications"
                className="
                flex size-8
                cursor-pointer
                items-center justify-center
                rounded-md
                transition-colors
                hover:bg-zinc-100
                dark:hover:bg-zinc-800
              "
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* CONTENT                                                             */}
          {/* ------------------------------------------------------------------- */}

          <div className="min-h-0 flex-1 overflow-y-auto pb-10">
            {notifications.length === 0 ? (
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
        </>
      )}
    </div>
  );
}

function NotificationLoader() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <div
        className="
          size-5
          animate-spin
          rounded-full
          border-2
          border-zinc-200
          border-t-zinc-700
          dark:border-zinc-700
          dark:border-t-zinc-200
        "
      />
    </div>
  );
}

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

      {isSocial && (
        <button
          type="button"
          aria-label="Delete notification"
          title="Delete notification"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

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

function getContentText(content: unknown): string | null {
  if (!content) {
    return null;
  }

  if (typeof content === "string") {
    const value = content.trim();

    return value || null;
  }

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

function EmptyNotifications() {
  return (
    <div
      className="
        flex h-full min-h-0
        flex-col
        items-center
        justify-center
        px-6
        text-center
      
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
          text-sm
          text-zinc-500
          dark:text-zinc-400
        "
      >
        New activity and prediction results will appear here.
      </p>
    </div>
  );
}

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
