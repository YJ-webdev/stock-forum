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
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { BiSolidChat } from "react-icons/bi";
import { RiHeartFill } from "react-icons/ri";
import { TbFlagFilled } from "react-icons/tb";

import {
  deleteAllSocialNotifications,
  deleteSocialNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type MyNotification,
} from "@/app/actions/notification";

import { LoadMoreButton } from "@/app/components/load-more-button";

import { resolveLanguage } from "@/lib/data/languages";

import {
  CONTENT_STATUS_LABELS,
  DATE_SECTION_LABELS,
  HISTORY_LABELS,
  NOTIFICATION_LABELS,
  NOTIFICATION_PANEL_LABELS,
  type DateSectionKey,
} from "@/lib/data/translations";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { formatTimeAgo } from "@/lib/utils/format-time-ago";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type ResolvedLanguage = ReturnType<typeof resolveLanguage>;

type PanelLabels = (typeof NOTIFICATION_LABELS)[ResolvedLanguage];

interface NotificationPanelProps {
  refreshKey: number;
  setOnNotification: Dispatch<SetStateAction<boolean>>;

  currentUser?: {
    id?: string;
    language?: string | null;
  } | null;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const NOTIFICATION_PAGE_SIZE = 20;

const NOTIFICATION_CACHE_TIME = 30 * 1000;

const SOCIAL_TYPES = new Set<MyNotification["type"]>([
  "COMMENT_LIKED",
  "REPLY_LIKED",
  "COMMENT_REPLIED",
  "REPLY_REPLIED",
]);

const SECTION_ORDER: DateSectionKey[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "earlier",
];

// -----------------------------------------------------------------------------
// CLIENT CACHE
// -----------------------------------------------------------------------------

interface NotificationCacheEntry {
  notifications: MyNotification[];
  fetchedAt: number;
  refreshKey: number;
}

const notificationCache = new Map<string, NotificationCacheEntry>();

// -----------------------------------------------------------------------------
// SORT
// -----------------------------------------------------------------------------

function sortNotifications(notifications: MyNotification[]) {
  return [...notifications].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    const safeATime = Number.isFinite(aTime) ? aTime : 0;
    const safeBTime = Number.isFinite(bTime) ? bTime : 0;

    return safeBTime - safeATime || b.id.localeCompare(a.id);
  });
}

// -----------------------------------------------------------------------------
// DATE GROUPING
// Device timezone; weeks begin on Monday.
// -----------------------------------------------------------------------------

function groupNotifications(notifications: MyNotification[], now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - ((thisWeek.getDay() + 6) % 7));

  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const groups: Record<DateSectionKey, MyNotification[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    last_week: [],
    this_month: [],
    earlier: [],
  };

  for (const notification of notifications) {
    const timestamp = new Date(notification.createdAt).getTime();

    let key: DateSectionKey;

    if (!Number.isFinite(timestamp)) {
      key = "earlier";
    } else if (timestamp >= today.getTime()) {
      key = "today";
    } else if (timestamp >= yesterday.getTime()) {
      key = "yesterday";
    } else if (timestamp >= thisWeek.getTime()) {
      key = "this_week";
    } else if (timestamp >= lastWeek.getTime()) {
      key = "last_week";
    } else if (timestamp >= thisMonth.getTime()) {
      key = "this_month";
    } else {
      key = "earlier";
    }

    groups[key].push(notification);
  }

  return SECTION_ORDER.map((key) => ({
    key,
    notifications: groups[key],
  })).filter((section) => section.notifications.length > 0);
}

// -----------------------------------------------------------------------------
// PANEL
// -----------------------------------------------------------------------------

export function NotificationPanel(props: NotificationPanelProps) {
  const userId = props.currentUser?.id;

  useEffect(() => {
    for (const cachedUserId of notificationCache.keys()) {
      if (cachedUserId !== userId) {
        notificationCache.delete(cachedUserId);
      }
    }
  }, [userId]);

  return <NotificationPanelContent key={userId ?? "uncached"} {...props} />;
}

function NotificationPanelContent({
  refreshKey,
  setOnNotification,
  currentUser,
}: NotificationPanelProps) {
  const userId = currentUser?.id;

  const language = resolveLanguage(currentUser?.language);

  const labels = NOTIFICATION_LABELS[language];
  const panelLabels = NOTIFICATION_PANEL_LABELS[language];
  const sectionLabels = DATE_SECTION_LABELS[language];
  const historyLabels = HISTORY_LABELS[language];

  const router = useRouter();

  const [initialCache] = useState(() =>
    userId ? notificationCache.get(userId) : undefined,
  );

  const [notifications, setNotifications] = useState<MyNotification[]>(
    () => initialCache?.notifications ?? [],
  );

  const [visibleCount, setVisibleCount] = useState(NOTIFICATION_PAGE_SIZE);

  const [loading, setLoading] = useState(!initialCache);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [sectionNow, setSectionNow] = useState(() => new Date());

  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // DATE SECTIONS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const updateDate = () => setSectionNow(new Date());

    const timer = window.setInterval(updateDate, 60_000);

    window.addEventListener("focus", updateDate);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateDate);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const cached = userId ? notificationCache.get(userId) : undefined;

    setLoadFailed(false);

    if (cached) {
      setNotifications(cached.notifications);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const isFresh =
      cached !== undefined &&
      cached.refreshKey === refreshKey &&
      Date.now() - cached.fetchedAt < NOTIFICATION_CACHE_TIME;

    if (isFresh && retryKey === 0) {
      return () => {
        cancelled = true;
      };
    }

    async function loadNotifications() {
      try {
        const result = await getNotifications();

        if (cancelled) {
          return;
        }

        if (userId) {
          notificationCache.set(userId, {
            notifications: result,
            fetchedAt: Date.now(),
            refreshKey,
          });
        }

        setNotifications(result);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load notifications:", error);
          setLoadFailed(true);
        }
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
  }, [userId, refreshKey, retryKey]);

  // ---------------------------------------------------------------------------
  // LOCAL STATE / CACHE
  // ---------------------------------------------------------------------------

  const saveNotifications = (next: MyNotification[]) => {
    setNotifications(next);

    if (userId) {
      const cached = notificationCache.get(userId);

      notificationCache.set(userId, {
        notifications: next,
        fetchedAt: cached?.fetchedAt ?? 0,
        refreshKey: cached?.refreshKey ?? refreshKey,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // OPEN / MARK READ
  // ---------------------------------------------------------------------------

  const handleNotificationClick = (notification: MyNotification) => {
    const href = getNotificationHref(notification);

    if (!notification.readAt && !isPending) {
      const now = new Date();

      saveNotifications(
        notifications.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                readAt: now,
              }
            : item,
        ),
      );

      startTransition(async () => {
        try {
          await markNotificationAsRead(notification.id);
        } catch (error) {
          console.error("Failed to mark notification as read:", error);

          setNotifications((current) => {
            const next = current.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    readAt: notification.readAt,
                  }
                : item,
            );

            if (userId) {
              const cached = notificationCache.get(userId);

              if (cached) {
                notificationCache.set(userId, {
                  ...cached,
                  notifications: next,
                });
              }
            }

            return next;
          });
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
    if (
      isPending ||
      !notifications.some((notification) => !notification.readAt)
    ) {
      return;
    }

    const previousNotifications = notifications;
    const now = new Date();

    saveNotifications(
      notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? now,
      })),
    );

    startTransition(async () => {
      try {
        await markAllNotificationsAsRead();
      } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        saveNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // DELETE ONE SOCIAL NOTIFICATION
  // ---------------------------------------------------------------------------

  const handleDeleteNotification = (notificationId: string) => {
    if (isPending) {
      return;
    }

    const previousNotifications = notifications;

    saveNotifications(
      notifications.filter(
        (notification) => notification.id !== notificationId,
      ),
    );

    startTransition(async () => {
      try {
        await deleteSocialNotification(notificationId);
      } catch (error) {
        console.error("Failed to delete notification:", error);
        saveNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // DELETE ALL SOCIAL NOTIFICATIONS
  // ---------------------------------------------------------------------------

  const handleDeleteAllSocial = () => {
    if (
      isPending ||
      !notifications.some((notification) => SOCIAL_TYPES.has(notification.type))
    ) {
      return;
    }

    const previousNotifications = notifications;

    saveNotifications(
      notifications.filter(
        (notification) => !SOCIAL_TYPES.has(notification.type),
      ),
    );

    startTransition(async () => {
      try {
        await deleteAllSocialNotifications();
      } catch (error) {
        console.error("Failed to delete social notifications:", error);
        saveNotifications(previousNotifications);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // VISIBLE NOTIFICATIONS
  // ---------------------------------------------------------------------------

  const sortedNotifications = sortNotifications(notifications);

  const visibleNotifications = sortedNotifications.slice(0, visibleCount);

  const notificationSections = groupNotifications(
    visibleNotifications,
    sectionNow,
  );

  const hasMoreNotifications = sortedNotifications.length > visibleCount;

  const hasSocialNotifications = notifications.some((notification) =>
    SOCIAL_TYPES.has(notification.type),
  );

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.readAt,
  );

  const handleLoadMore = () => {
    setVisibleCount((current) => current + NOTIFICATION_PAGE_SIZE);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <section className="flex h-full min-h-0 w-full flex-col text-zinc-800 dark:text-zinc-300">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1.5">
        <h2 className="sr-only">{labels.heading}</h2>

        <p className="min-w-0 truncate text-xs font-normal tracking-wider text-muted-foreground/50">
          {panelLabels.description}
        </p>

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

      <div className="flex shrink-0 items-center gap-1">
        {!loading && hasUnreadNotifications && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleMarkAllRead}
            aria-label={labels.mark_all_read}
            title={labels.mark_all_read}
            className="
              flex size-8 cursor-pointer items-center justify-center
              rounded-md text-zinc-400 transition-colors
              hover:bg-zinc-100 hover:text-zinc-900
              disabled:cursor-default disabled:opacity-50
              dark:text-zinc-500 dark:hover:bg-zinc-800
              dark:hover:text-zinc-100
            "
          >
            <CheckCheck className="size-4" aria-hidden="true" />
          </button>
        )}

        {!loading && hasSocialNotifications && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDeleteAllSocial}
            aria-label={labels.clear}
            title={labels.clear}
            className="
              flex size-8 cursor-pointer items-center justify-center
              rounded-md text-zinc-400 transition-colors
              hover:bg-zinc-100 hover:text-rose-600
              disabled:cursor-default disabled:opacity-50
              dark:text-zinc-500 dark:hover:bg-zinc-800
              dark:hover:text-rose-400
            "
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <NotificationLoader labels={labels} />
        ) : notifications.length === 0 && !loadFailed ? (
          <EmptyNotifications message={labels.empty} />
        ) : (
          <div>
            {notificationSections.map((section) => (
              <section key={section.key}>
                {section.key !== "today" && (
                  <h3
                    className="
                      mx-3 rounded-md border border-zinc-300
                      bg-zinc-50 px-3 py-2
                      text-xs font-normal text-zinc-500
                      dark:border-zinc-700 dark:bg-zinc-800
                      dark:text-zinc-300
                    "
                  >
                    {sectionLabels[section.key]}
                  </h3>
                )}

                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {section.notifications.map((notification) => (
                    <li key={notification.id}>
                      <NotificationItem
                        notification={notification}
                        language={language}
                        isPending={isPending}
                        onClick={() => handleNotificationClick(notification)}
                        onDelete={() =>
                          handleDeleteNotification(notification.id)
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {!loading && !loadFailed && hasMoreNotifications && (
          <LoadMoreButton
            loading={false}
            loadingLabel={labels.loading}
            label={historyLabels.load_more}
            onClick={handleLoadMore}
          />
        )}

        {loadFailed && (
          <div className="px-4 py-4 text-center" role="alert">
            <p className="text-sm text-rose-500">{panelLabels.load_failed}</p>

            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="
                mt-2 inline-flex cursor-pointer items-center gap-1.5
                text-sm text-zinc-500 underline
                hover:text-zinc-900
                dark:text-zinc-400 dark:hover:text-zinc-100
              "
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {panelLabels.retry}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// LOADER
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// ITEM
// -----------------------------------------------------------------------------

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

  const createdAt = new Date(notification.createdAt);

  const dateTime = Number.isFinite(createdAt.getTime())
    ? createdAt.toISOString()
    : undefined;

  return (
    <div
      className={`
        group relative flex w-full transition-colors
        hover:bg-zinc-50 dark:hover:bg-zinc-800/40
        ${unread ? "bg-zinc-50/80 dark:bg-zinc-800/20" : ""}
      `}
    >
      <button
        type="button"
        onClick={onClick}
        className="
          flex min-w-0 flex-1 cursor-pointer gap-3
          px-4 py-4 pe-11 text-start
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-inset
          focus-visible:ring-zinc-400
        "
      >
        <span className="mt-0.75 flex shrink-0 items-start justify-center">
          <NotificationIcon type={notification.type} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`
                block min-w-0 flex-1 truncate text-[15px]
                ${unread ? "font-semibold" : "font-medium"}
              `}
            >
              {title}
            </span>

            {unread && (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-amber-500"
              />
            )}
          </span>

          {message && (
            <span className="mt-1 block truncate text-sm text-zinc-500 dark:text-zinc-400">
              {message}
            </span>
          )}

          {preview && (
            <span className="mt-1 block truncate text-sm text-zinc-400 dark:text-zinc-500">
              “{preview}”
            </span>
          )}

          <time
            dateTime={dateTime}
            className="mt-1.5 block truncate text-xs text-zinc-400 dark:text-zinc-500"
          >
            {formatTimeAgo(notification.createdAt, language, labels.just_now)}
          </time>
        </span>
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
            rounded-md text-zinc-400 transition-colors
            hover:bg-zinc-100 hover:text-rose-600
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-zinc-400
            disabled:cursor-default disabled:opacity-50
            dark:text-zinc-500 dark:hover:bg-zinc-800
            dark:hover:text-rose-400
            md:opacity-0 md:group-hover:opacity-100
            md:group-focus-within:opacity-100
          "
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TEXT
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// PREVIEW
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

// -----------------------------------------------------------------------------
// LINK
// -----------------------------------------------------------------------------

function getNotificationHref(notification: MyNotification): string | null {
  switch (notification.type) {
    case "COMMENT_LIKED":
    case "COMMENT_REPORTED": {
      const symbol = notification.comment?.assets[0]?.asset.symbol;
      const commentId = notification.commentId;

      if (!symbol || !commentId) {
        return null;
      }

      const query = new URLSearchParams({
        comment: commentId,
      });

      if (notification.type === "COMMENT_REPORTED") {
        query.set("from", "report");
      }

      return `/market/${encodeURIComponent(symbol)}?${query}`;
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

      const query = new URLSearchParams({
        comment: commentId,
        reply: replyId,
      });

      if (notification.type === "REPLY_REPORTED") {
        query.set("from", "report");
      }

      return `/market/${encodeURIComponent(symbol)}?${query}`;
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

// -----------------------------------------------------------------------------
// ICON
// -----------------------------------------------------------------------------

function NotificationIcon({ type }: { type: MyNotification["type"] }) {
  const className = "size-4 text-zinc-500 dark:text-zinc-400";

  switch (type) {
    case "COMMENT_LIKED":
    case "REPLY_LIKED":
      return <RiHeartFill className={className} aria-hidden="true" />;

    case "COMMENT_REPLIED":
    case "REPLY_REPLIED":
      return <BiSolidChat className={className} aria-hidden="true" />;

    case "COMMENT_REPORTED":
    case "REPLY_REPORTED":
      return <TbFlagFilled className={className} aria-hidden="true" />;

    case "PREDICTION_WON":
      return (
        <TrendingUp
          className="size-4 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      );

    case "PREDICTION_LOST":
      return (
        <TrendingDown
          className="size-4 text-rose-600 dark:text-rose-400"
          aria-hidden="true"
        />
      );

    case "PREDICTION_PENDING":
      return (
        <CircleAlert className="size-4 text-amber-500" aria-hidden="true" />
      );

    case "PREDICTION_DRAW":
    case "PREDICTION_VOID":
      return <CircleAlert className={className} aria-hidden="true" />;

    default:
      return <Bell className={className} aria-hidden="true" />;
  }
}

// -----------------------------------------------------------------------------
// EMPTY
// -----------------------------------------------------------------------------

function EmptyNotifications({ message }: { message: string }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
      <Bell
        className="mb-3 size-6 text-zinc-300 dark:text-zinc-700"
        aria-hidden="true"
      />

      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}
