"use client";

import {
  useEffect,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";

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

import { resolveLanguage } from "@/lib/data/languages";
import {
  CONTENT_STATUS_LABELS,
  NOTIFICATION_LABELS,
} from "@/lib/data/translations";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

type ResolvedLanguage = ReturnType<typeof resolveLanguage>;
type PanelLabels = (typeof NOTIFICATION_LABELS)[ResolvedLanguage];

interface NotificationPanelProps {
  refreshKey: number;
  setOnNotification: Dispatch<SetStateAction<boolean>>;

  currentUser?: {
    language?: string | null;
  } | null;
}

const SOCIAL_TYPES = new Set<MyNotification["type"]>([
  "COMMENT_LIKED",
  "REPLY_LIKED",
  "COMMENT_REPLIED",
  "REPLY_REPLIED",
]);

let notificationCache: MyNotification[] | null = null;
let notificationRequest: Promise<MyNotification[]> | null = null;

function fetchNotifications() {
  if (!notificationRequest) {
    notificationRequest = getNotifications().finally(() => {
      notificationRequest = null;
    });
  }

  return notificationRequest;
}

export function NotificationPanel({
  refreshKey,
  setOnNotification,
  currentUser,
}: NotificationPanelProps) {
  const language = resolveLanguage(currentUser?.language);
  const labels = NOTIFICATION_LABELS[language];

  const [notifications, setNotifications] = useState<MyNotification[]>(
    () => notificationCache ?? [],
  );

  const [loading, setLoading] = useState(notificationCache === null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (notificationCache === null) {
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

  const updateNotifications = (
    updater: (current: MyNotification[]) => MyNotification[],
  ) => {
    setNotifications((current) => {
      const next = updater(current);
      notificationCache = next;

      return next;
    });
  };

  const restoreNotifications = (previous: MyNotification[]) => {
    notificationCache = previous;
    setNotifications(previous);
  };

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

      void markNotificationAsRead(notification.id).catch((error) => {
        console.error("Failed to mark notification as read:", error);
      });
    }

    if (href) {
      router.push(href);
    }
  };

  const handleMarkAllRead = () => {
    const hasUnread = notifications.some((item) => !item.readAt);

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
        restoreNotifications(previousNotifications);
      }
    });
  };

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
        restoreNotifications(previousNotifications);
      }
    });
  };

  const handleDeleteAllSocial = () => {
    if (isPending) {
      return;
    }

    const hasSocial = notifications.some((notification) =>
      SOCIAL_TYPES.has(notification.type),
    );

    if (!hasSocial) {
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
        restoreNotifications(previousNotifications);
      }
    });
  };

  const hasSocialNotifications = notifications.some((notification) =>
    SOCIAL_TYPES.has(notification.type),
  );

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.readAt,
  );

  return (
    <section
      aria-labelledby="notifications-heading"
      dir={language === "ar" ? "rtl" : "ltr"}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2">
        <h2
          id="notifications-heading"
          className="text-xs font-normal tracking-wider text-muted-foreground/50"
        >
          {labels.heading}
        </h2>

        <div className="flex shrink-0 items-center gap-3">
          {!loading && hasUnreadNotifications && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleMarkAllRead}
              className="
                flex cursor-pointer items-center gap-1.5
                text-xs text-zinc-500 transition-colors
                hover:text-zinc-900
                disabled:cursor-default disabled:opacity-50
                dark:text-zinc-400 dark:hover:text-zinc-100
              "
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              {labels.mark_all_read}
            </button>
          )}

          {!loading && hasSocialNotifications && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteAllSocial}
              className="
                flex cursor-pointer items-center gap-1.5
                text-xs text-zinc-500 transition-colors
                hover:text-rose-600
                disabled:cursor-default disabled:opacity-50
                dark:text-zinc-400 dark:hover:text-rose-400
              "
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {labels.clear}
            </button>
          )}

          <button
            type="button"
            onClick={() => setOnNotification(false)}
            aria-label={labels.close}
            className="
              flex size-8 cursor-pointer items-center justify-center
              rounded-md text-zinc-500 transition-colors
              hover:bg-zinc-100 hover:text-zinc-900
              dark:text-zinc-400 dark:hover:bg-zinc-800
              dark:hover:text-zinc-100
            "
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <NotificationLoader labels={labels} />
        ) : notifications.length === 0 ? (
          <EmptyNotifications labels={labels} />
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              language={language}
              isPending={isPending}
              onClick={() => handleNotificationClick(notification)}
              onDelete={() => handleDeleteNotification(notification.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function NotificationLoader({ labels }: { labels: PanelLabels }) {
  return (
    <div
      role="status"
      className="flex h-full min-h-0 items-center justify-center"
    >
      <div
        aria-hidden="true"
        className="
          size-5 animate-spin rounded-full
          border-2 border-zinc-200 border-t-zinc-700
          dark:border-zinc-700 dark:border-t-zinc-200
        "
      />

      <span className="sr-only">{labels.loading}</span>
    </div>
  );
}

function NotificationItem({
  notification,
  language,
  isPending,
  onClick,
  onDelete,
}: {
  notification: MyNotification;
  language: ResolvedLanguage;
  isPending: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const labels = NOTIFICATION_LABELS[language];
  const unread = notification.readAt === null;
  const isSocial = SOCIAL_TYPES.has(notification.type);

  const preview = getNotificationPreview(notification);
  const { title, message } = getNotificationText(notification, language);

  return (
    <div
      className={`
        group relative flex w-full
        border-b border-zinc-100 transition-colors
        hover:bg-zinc-50
        dark:border-zinc-800 dark:hover:bg-zinc-900
        ${unread ? "bg-zinc-50/80 dark:bg-zinc-900/60" : ""}
      `}
    >
      <button
        type="button"
        onClick={onClick}
        className="
          flex min-w-0 flex-1 cursor-pointer gap-3
          px-4 py-3 pe-10 text-start
        "
      >
        <div className="mt-0.5 shrink-0">
          <NotificationIcon type={notification.type} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p
              className={`
                min-w-0 flex-1 text-sm
                ${unread ? "font-semibold" : "font-medium"}
              `}
            >
              {title}
            </p>

            {unread && (
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500"
              />
            )}
          </div>

          {message && (
            <div
              className="
                mt-1 flex items-center gap-1.5
                text-sm leading-5 text-zinc-500 dark:text-zinc-400
              "
            >
              <span>{message}</span>

              {(notification.type === "COMMENT_LIKED" ||
                notification.type === "REPLY_LIKED") && (
                <RiHeartFill className="size-4 shrink-0" aria-hidden="true" />
              )}
            </div>
          )}

          {preview && (
            <p
              className="
                mt-1 truncate text-sm
                text-zinc-400 dark:text-zinc-500
              "
            >
              “{preview}”
            </p>
          )}

          <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            {formatNotificationTime(notification.createdAt, language)}
          </p>
        </div>
      </button>

      {isSocial && (
        <button
          type="button"
          disabled={isPending}
          aria-label={labels.delete}
          title={labels.delete}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="
            absolute top-3 inset-e-3
            flex size-7 cursor-pointer items-center justify-center
            rounded-md text-zinc-400 opacity-0 transition
            hover:bg-zinc-200 hover:text-rose-600
            group-hover:opacity-100 focus:opacity-100
            disabled:cursor-default disabled:opacity-50
            dark:hover:bg-zinc-800 dark:hover:text-rose-400
          "
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function getNotificationText(
  notification: MyNotification,
  language: ResolvedLanguage,
): { title: string; message: string | null } {
  const labels = NOTIFICATION_LABELS[language];
  const statusLabels = CONTENT_STATUS_LABELS[language];

  const name = notification.actor?.name?.trim() || labels.someone;

  const withName = (template: string) => template.replace("{name}", () => name);

  switch (notification.type) {
    case "COMMENT_LIKED":
      return {
        title: labels.liked,
        message: withName(labels.comment_liked),
      };

    case "REPLY_LIKED":
      return {
        title: labels.liked,
        message: withName(labels.reply_liked),
      };

    case "COMMENT_REPLIED":
      return {
        title: statusLabels.new_reply,
        message: withName(labels.comment_replied),
      };

    case "REPLY_REPLIED":
      return {
        title: statusLabels.new_reply,
        message: withName(labels.reply_replied),
      };

    case "COMMENT_REPORTED":
      return {
        title: statusLabels.comment_reported,
        message: statusLabels.comment_report_message,
      };

    case "REPLY_REPORTED":
      return {
        title: statusLabels.reply_reported,
        message: statusLabels.reply_report_message,
      };

    case "PREDICTION_WON":
    case "PREDICTION_LOST":
    case "PREDICTION_DRAW":
    case "PREDICTION_VOID":
    case "PREDICTION_PENDING": {
      const titles = {
        PREDICTION_WON: labels.prediction_won,
        PREDICTION_LOST: labels.prediction_lost,
        PREDICTION_DRAW: labels.prediction_draw,
        PREDICTION_VOID: labels.prediction_void,
        PREDICTION_PENDING: labels.prediction_pending,
      };

      const prediction = notification.prediction;

      if (!prediction) {
        return {
          title: titles[notification.type],
          message: null,
        };
      }

      const market = ALL_MARKET_SYMBOLS.find(
        (item) => item.symbol === prediction.symbol,
      );

      const marketName = market?.name ?? prediction.symbol;

      const formatter = new Intl.NumberFormat(language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const from = prediction.referenceClose;
      const to = prediction.settlementClose;

      const hasSettlement =
        notification.type === "PREDICTION_WON" ||
        notification.type === "PREDICTION_LOST" ||
        notification.type === "PREDICTION_DRAW";

      return {
        title: titles[notification.type],
        message:
          hasSettlement &&
          Number.isFinite(from) &&
          to !== null &&
          Number.isFinite(to)
            ? `${marketName}: ${formatter.format(from)} → ${formatter.format(to)}`
            : marketName,
      };
    }

    default:
      return {
        title: notification.title,
        message: notification.message,
      };
  }
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
    return content.trim() || null;
  }

  if (typeof content === "object") {
    return extractTextFromTipTap(content).trim() || null;
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

  return node.content.map(extractTextFromTipTap).join(" ");
}

function getNotificationHref(notification: MyNotification): string | null {
  switch (notification.type) {
    case "COMMENT_LIKED":
    case "COMMENT_REPORTED": {
      const symbol = notification.comment?.assets[0]?.asset.symbol;
      const commentId = notification.commentId;

      if (!symbol || !commentId) {
        return null;
      }

      const reportQuery =
        notification.type === "COMMENT_REPORTED" ? "&from=report" : "";

      return `/market/${encodeURIComponent(
        symbol,
      )}?comment=${encodeURIComponent(commentId)}${reportQuery}`;
    }

    case "REPLY_LIKED":
    case "COMMENT_REPLIED":
    case "REPLY_REPLIED":
    case "REPLY_REPORTED": {
      const symbol = notification.reply?.comment.assets[0]?.asset.symbol;

      const commentId =
        notification.commentId ?? notification.reply?.comment.id;

      const replyId = notification.replyId;

      if (!symbol || !commentId || !replyId) {
        return null;
      }

      const reportQuery =
        notification.type === "REPLY_REPORTED" ? "&from=report" : "";

      return `/market/${encodeURIComponent(
        symbol,
      )}?comment=${encodeURIComponent(commentId)}&reply=${encodeURIComponent(
        replyId,
      )}${reportQuery}`;
    }

    case "PREDICTION_WON":
    case "PREDICTION_LOST":
    case "PREDICTION_DRAW":
    case "PREDICTION_VOID":
    case "PREDICTION_PENDING": {
      const symbol = notification.prediction?.symbol;

      return symbol ? `/market/${encodeURIComponent(symbol)}` : null;
    }

    default:
      return null;
  }
}

function NotificationIcon({ type }: { type: MyNotification["type"] }) {
  switch (type) {
    case "PREDICTION_WON":
      return (
        <TrendingUp className="size-5 text-emerald-600" aria-hidden="true" />
      );

    case "PREDICTION_LOST":
      return (
        <TrendingDown className="size-5 text-rose-600" aria-hidden="true" />
      );

    case "PREDICTION_PENDING":
      return (
        <CircleAlert className="size-5 text-amber-500" aria-hidden="true" />
      );

    case "PREDICTION_DRAW":
    case "PREDICTION_VOID":
      return (
        <CircleAlert className="size-5 text-zinc-500" aria-hidden="true" />
      );

    default:
      return <Bell className="size-5 text-zinc-500" aria-hidden="true" />;
  }
}

function EmptyNotifications({ labels }: { labels: PanelLabels }) {
  return (
    <div
      className="
        flex h-full min-h-0 flex-col
        items-center justify-center px-6 text-center
      "
    >
      <Bell
        className="mb-3 size-6 text-zinc-300 dark:text-zinc-700"
        aria-hidden="true"
      />

      <p className="text-sm font-medium">{labels.empty}</p>

      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {labels.empty_description}
      </p>
    </div>
  );
}

function formatNotificationTime(
  date: Date | string,
  language: ResolvedLanguage,
) {
  const value = new Date(date);
  const timestamp = value.getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const diff = Math.max(0, Date.now() - timestamp);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return NOTIFICATION_LABELS[language].just_now;
  }

  const formatter = new Intl.RelativeTimeFormat(language, {
    numeric: "always",
    style: "short",
  });

  if (diff < hour) {
    return formatter.format(-Math.floor(diff / minute), "minute");
  }

  if (diff < day) {
    return formatter.format(-Math.floor(diff / hour), "hour");
  }

  if (diff < 7 * day) {
    return formatter.format(-Math.floor(diff / day), "day");
  }

  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}
