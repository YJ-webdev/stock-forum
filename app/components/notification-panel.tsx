// app/components/notification-panel.tsx

"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";

import { useRouter } from "next/navigation";

import {
  Award,
  Bell,
  CheckCheck,
  CircleAlert,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import {
  FaFaceMeh,
  FaFaceSmile,
  FaRegFaceSmile,
  FaXmark,
} from "react-icons/fa6";

import { BiSolidChat } from "react-icons/bi";
import { RiHeartFill } from "react-icons/ri";
import { TbFlagFilled } from "react-icons/tb";
import { GoAlertFill } from "react-icons/go";

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
import { IoAlertCircle } from "react-icons/io5";
import {
  FcAbout,
  FcApproval,
  FcBearish,
  FcCancel,
  FcDebt,
  FcDonate,
  FcHighPriority,
  FcIdea,
  FcLeave,
  FcLikePlaceholder,
  FcOvertime,
  FcSms,
  FcVoicePresentation,
} from "react-icons/fc";

// -----------------------------------------------------------------------------
// TYPES / CONSTANTS
// -----------------------------------------------------------------------------

const NOTIFICATION_TIER_NAMES = {
  UNRANKED: "Unranked",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
} as const;

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

interface NotificationCacheEntry {
  notifications: MyNotification[];
  fetchedAt: number;
  refreshKey: number;
}

interface SectionRequest {
  key: DateSectionKey;
  opening: boolean;
}

const NOTIFICATION_PAGE_SIZE = 20;
const NOTIFICATION_CACHE_TIME = 30_000;

const SMALL_TOUCH_QUERY =
  "(max-width: 767px) and (hover: none) and (pointer: coarse)";

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

const notificationCache = new Map<string, NotificationCacheEntry>();

// -----------------------------------------------------------------------------
// SORT / DATE GROUPING
// -----------------------------------------------------------------------------

function sortNotifications(notifications: MyNotification[]) {
  return [...notifications].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    return (
      (Number.isFinite(bTime) ? bTime : 0) -
        (Number.isFinite(aTime) ? aTime : 0) || b.id.localeCompare(a.id)
    );
  });
}

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

    const key: DateSectionKey = !Number.isFinite(timestamp)
      ? "earlier"
      : timestamp >= today.getTime()
        ? "today"
        : timestamp >= yesterday.getTime()
          ? "yesterday"
          : timestamp >= thisWeek.getTime()
            ? "this_week"
            : timestamp >= lastWeek.getTime()
              ? "last_week"
              : timestamp >= thisMonth.getTime()
                ? "this_month"
                : "earlier";

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
  const router = useRouter();
  const userId = currentUser?.id;
  const language = resolveLanguage(currentUser?.language);

  const labels = NOTIFICATION_LABELS[language];
  const panelLabels = NOTIFICATION_PANEL_LABELS[language];
  const sectionLabels = DATE_SECTION_LABELS[language];
  const historyLabels = HISTORY_LABELS[language];

  const [initialCache] = useState(() =>
    userId ? notificationCache.get(userId) : undefined,
  );

  const [notifications, setNotifications] = useState<MyNotification[]>(
    initialCache?.notifications ?? [],
  );

  const [visibleCount, setVisibleCount] = useState(NOTIFICATION_PAGE_SIZE);
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [sectionNow, setSectionNow] = useState(() => new Date());

  const [swipedNotificationId, setSwipedNotificationId] = useState<
    string | null
  >(null);

  const [collapsedSections, setCollapsedSections] = useState<
    Partial<Record<DateSectionKey, boolean>>
  >({});

  const [sectionRequest, setSectionRequest] = useState<SectionRequest | null>(
    null,
  );

  const [headerHeights, setHeaderHeights] = useState<
    Partial<Record<DateSectionKey, number>>
  >({});

  const [isPending, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const headerRefs = useRef<
    Partial<Record<DateSectionKey, HTMLHeadingElement | null>>
  >({});

  const recordStartRefs = useRef<
    Partial<Record<DateSectionKey, HTMLDivElement | null>>
  >({});

  const mutationBusy = useRef(false);
  const notificationsRef = useRef(notifications);
  const mounted = useRef(false);

  const sortedNotifications = sortNotifications(notifications);
  const visibleNotifications = sortedNotifications.slice(0, visibleCount);
  const notificationSections = groupNotifications(
    visibleNotifications,
    sectionNow,
  );

  const sectionSignature = notificationSections
    .map((section) => section.key)
    .join(",");

  const hasMoreNotifications = sortedNotifications.length > visibleCount;

  const hasSocialNotifications = notifications.some((notification) =>
    SOCIAL_TYPES.has(notification.type),
  );

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.readAt,
  );

  const mutationDisabled = isPending || refreshing;

  // ---------------------------------------------------------------------------
  // LIFECYCLE / DATE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

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
  // STATE / CACHE
  // ---------------------------------------------------------------------------

  function saveNotifications(next: MyNotification[]) {
    notificationsRef.current = next;

    if (mounted.current) {
      setNotifications(next);
    }

    if (userId) {
      const cached = notificationCache.get(userId);

      notificationCache.set(userId, {
        notifications: next,
        fetchedAt: cached?.fetchedAt ?? 0,
        refreshKey: cached?.refreshKey ?? refreshKey,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const cached = userId ? notificationCache.get(userId) : undefined;

    setLoadFailed(false);

    if (cached) {
      notificationsRef.current = cached.notifications;
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
      setRefreshing(false);

      return () => {
        cancelled = true;
      };
    }

    setRefreshing(Boolean(cached));

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

        notificationsRef.current = result;
        setNotifications(result);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load notifications:", error);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey, retryKey]);

  // ---------------------------------------------------------------------------
  // OPEN / MARK READ
  // ---------------------------------------------------------------------------

  function handleNotificationClick(notification: MyNotification) {
    const href = getNotificationHref(notification);

    if (!notification.readAt && !mutationDisabled && !mutationBusy.current) {
      mutationBusy.current = true;

      const now = new Date();

      saveNotifications(
        notificationsRef.current.map((item) =>
          item.id === notification.id ? { ...item, readAt: now } : item,
        ),
      );

      startTransition(async () => {
        try {
          await markNotificationAsRead(notification.id);
        } catch (error) {
          console.error("Failed to mark notification as read:", error);

          saveNotifications(
            notificationsRef.current.map((item) =>
              item.id === notification.id
                ? { ...item, readAt: notification.readAt }
                : item,
            ),
          );
        } finally {
          mutationBusy.current = false;
        }
      });
    }

    if (href) {
      router.push(href);
    }
  }

  // ---------------------------------------------------------------------------
  // MARK ALL READ
  // ---------------------------------------------------------------------------

  function handleMarkAllRead() {
    if (
      mutationDisabled ||
      mutationBusy.current ||
      !notificationsRef.current.some((item) => !item.readAt)
    ) {
      return;
    }

    mutationBusy.current = true;

    const previous = notificationsRef.current;
    const now = new Date();

    saveNotifications(
      previous.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? now,
      })),
    );

    startTransition(async () => {
      try {
        await markAllNotificationsAsRead();
      } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        saveNotifications(previous);
      } finally {
        mutationBusy.current = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // DELETE ONE SOCIAL NOTIFICATION
  // ---------------------------------------------------------------------------

  function handleDeleteNotification(notification: MyNotification) {
    if (
      mutationDisabled ||
      mutationBusy.current ||
      !SOCIAL_TYPES.has(notification.type)
    ) {
      return;
    }

    mutationBusy.current = true;

    const previous = notificationsRef.current;

    saveNotifications(previous.filter((item) => item.id !== notification.id));

    setSwipedNotificationId(null);

    startTransition(async () => {
      try {
        await deleteSocialNotification(notification.id);
      } catch (error) {
        console.error("Failed to delete notification:", error);
        saveNotifications(previous);
      } finally {
        mutationBusy.current = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // DELETE ALL SOCIAL NOTIFICATIONS
  // ---------------------------------------------------------------------------

  function handleDeleteAllSocial() {
    if (
      mutationDisabled ||
      mutationBusy.current ||
      !notificationsRef.current.some((item) => SOCIAL_TYPES.has(item.type))
    ) {
      return;
    }

    mutationBusy.current = true;

    const previous = notificationsRef.current;

    saveNotifications(previous.filter((item) => !SOCIAL_TYPES.has(item.type)));

    setSwipedNotificationId(null);

    startTransition(async () => {
      try {
        await deleteAllSocialNotifications();
      } catch (error) {
        console.error("Failed to delete social notifications:", error);
        saveNotifications(previous);
      } finally {
        mutationBusy.current = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // DATE HEADER MEASUREMENT
  // ---------------------------------------------------------------------------

  useLayoutEffect(() => {
    const keys = sectionSignature
      ? (sectionSignature.split(",") as DateSectionKey[])
      : [];

    function measure() {
      const next: Partial<Record<DateSectionKey, number>> = {};

      for (const key of keys) {
        const header = headerRefs.current[key];

        if (!header) {
          continue;
        }

        const height = Number.parseFloat(
          window.getComputedStyle(header).height,
        );

        next[key] = Number.isFinite(height) ? height : header.offsetHeight;
      }

      setHeaderHeights((current) => {
        const unchanged =
          Object.keys(current).length === Object.keys(next).length &&
          keys.every(
            (key) => Math.abs((current[key] ?? 0) - (next[key] ?? 0)) < 0.01,
          );

        return unchanged ? current : next;
      });
    }

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);

      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);

    for (const key of keys) {
      const header = headerRefs.current[key];

      if (header) {
        observer.observe(header);
      }
    }

    return () => observer.disconnect();
  }, [sectionSignature, language, loading]);

  function getHeaderHeight(key: DateSectionKey) {
    return headerHeights[key] ?? 36;
  }

  function getHeaderTop(index: number) {
    return notificationSections
      .slice(0, index)
      .reduce((total, section) => total + getHeaderHeight(section.key), 0);
  }

  function handlePeriodClick(key: DateSectionKey) {
    const index = notificationSections.findIndex(
      (section) => section.key === key,
    );

    if (index < 0) {
      return;
    }

    const container = scrollRef.current;
    const start = recordStartRefs.current[key];

    const collapsed = Boolean(collapsedSections[key]);
    let scrolledPastStart = false;

    if (container && start) {
      const recordsTop =
        container.getBoundingClientRect().top +
        container.clientTop +
        getHeaderTop(index) +
        getHeaderHeight(key);

      scrolledPastStart = start.getBoundingClientRect().top < recordsTop - 2;
    }

    const opening = collapsed || scrolledPastStart;

    setSwipedNotificationId(null);

    setCollapsedSections((current) => ({
      ...current,
      [key]: !opening,
    }));

    setSectionRequest({ key, opening });
  }

  useLayoutEffect(() => {
    if (!sectionRequest) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const start = recordStartRefs.current[sectionRequest.key];

      if (sectionRequest.opening && start) {
        start.scrollIntoView({
          block: "start",
          inline: "nearest",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }

      setSectionRequest(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sectionRequest, headerHeights]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <section
      aria-label={labels.heading}
      className="
        relative flex h-full min-h-0 w-full flex-col
        text-zinc-800 dark:text-zinc-300
      "
    >
      <div className="absolute right-1 top-0.5 z-50 flex items-center">
        {!loading && hasUnreadNotifications && (
          <button
            type="button"
            disabled={mutationDisabled}
            onClick={handleMarkAllRead}
            aria-label={labels.mark_all_read}
            title={labels.mark_all_read}
            className="
              flex size-8 cursor-pointer items-center justify-center
              rounded-md bg-zinc-100 text-zinc-500
              transition-colors hover:bg-zinc-200 hover:text-zinc-900
              disabled:cursor-default disabled:opacity-50
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-zinc-400
              dark:bg-zinc-800 dark:text-zinc-400
              dark:hover:bg-zinc-700 dark:hover:text-zinc-100
            "
          >
            <CheckCheck className="size-4" aria-hidden="true" />
          </button>
        )}

        {!loading && hasSocialNotifications && (
          <button
            type="button"
            disabled={mutationDisabled}
            onClick={handleDeleteAllSocial}
            aria-label={labels.clear}
            title={labels.clear}
            className="
              flex size-8 cursor-pointer items-center justify-center
              rounded-md bg-zinc-100 text-zinc-500
              transition-colors hover:bg-zinc-200 hover:text-rose-600
              disabled:cursor-default disabled:opacity-50
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-zinc-400
              dark:bg-zinc-800 dark:text-zinc-400
              dark:hover:bg-zinc-700 dark:hover:text-rose-400
            "
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setOnNotification(false)}
          aria-label={labels.close}
          className="
            flex size-8 cursor-pointer items-center justify-center
            rounded-md bg-zinc-100 text-zinc-500
            transition-colors hover:bg-zinc-200 hover:text-zinc-900
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-zinc-400
            dark:bg-zinc-800 dark:text-zinc-400
            dark:hover:bg-zinc-700 dark:hover:text-zinc-100
          "
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="
          relative min-h-0 flex-1 overflow-y-auto
          [overflow-anchor:none]
        "
      >
        {loading ? (
          <NotificationLoader labels={labels} />
        ) : notifications.length === 0 && !loadFailed ? (
          <EmptyNotifications message={labels.empty} />
        ) : (
          <>
            {notificationSections.map((section, index) => {
              const collapsed = Boolean(collapsedSections[section.key]);

              const labelsBottom =
                getHeaderTop(index) + getHeaderHeight(section.key);

              return (
                <Fragment key={section.key}>
                  <h3
                    ref={(element) => {
                      headerRefs.current[section.key] = element;
                    }}
                    style={{
                      top: getHeaderTop(index),
                      zIndex: 30 - index,
                    }}
                    className="sticky m-0 w-full"
                  >
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      aria-controls={`notification-records-${section.key}`}
                      onClick={() => handlePeriodClick(section.key)}
                      className="
                        block w-full cursor-pointer
                        bg-zinc-100 py-2.5 pl-4 pr-28 text-start
                        text-xs font-medium text-zinc-500
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-inset
                        focus-visible:ring-zinc-400
                        dark:bg-zinc-800 dark:text-zinc-300
                      "
                    >
                      {sectionLabels[section.key]}
                    </button>
                  </h3>

                  {!collapsed && (
                    <div
                      ref={(element) => {
                        recordStartRefs.current[section.key] = element;
                      }}
                      aria-hidden="true"
                      style={{
                        scrollMarginTop: labelsBottom,
                      }}
                      className="h-px -mb-px w-full"
                    />
                  )}

                  <ul
                    id={`notification-records-${section.key}`}
                    hidden={collapsed}
                    className="
                      m-0 list-none p-0
                      divide-y divide-zinc-100 dark:divide-zinc-800
                    "
                  >
                    {section.notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        language={language}
                        isPending={mutationDisabled}
                        isOpen={swipedNotificationId === notification.id}
                        onOpen={() => setSwipedNotificationId(notification.id)}
                        onClose={() =>
                          setSwipedNotificationId((current) =>
                            current === notification.id ? null : current,
                          )
                        }
                        onClick={() => handleNotificationClick(notification)}
                        onDelete={() => handleDeleteNotification(notification)}
                      />
                    ))}
                  </ul>
                </Fragment>
              );
            })}
          </>
        )}

        {!loading && !loadFailed && hasMoreNotifications && (
          <div className="px-4 py-3">
            <LoadMoreButton
              loading={false}
              loadingLabel={labels.loading}
              label={historyLabels.load_more}
              onClick={() =>
                setVisibleCount((current) => current + NOTIFICATION_PAGE_SIZE)
              }
            />
          </div>
        )}

        {loadFailed && (
          <div className="px-4 py-4 text-center" role="alert">
            <p className="text-sm text-rose-500">{panelLabels.load_failed}</p>

            <button
              type="button"
              disabled={isPending || refreshing}
              onClick={() => setRetryKey((value) => value + 1)}
              className="
                mt-2 inline-flex cursor-pointer items-center gap-1.5
                text-sm text-zinc-500 underline
                hover:text-zinc-900
                disabled:cursor-default disabled:opacity-50
                dark:text-zinc-400 dark:hover:text-zinc-100
              "
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {panelLabels.retry}
            </button>
          </div>
        )}

        {refreshing && (
          <span role="status" className="sr-only">
            {labels.loading}
          </span>
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// ITEM
// -----------------------------------------------------------------------------

function NotificationItem({
  notification,
  language,
  isPending,
  isOpen,
  onOpen,
  onClose,
  onClick,
  onDelete,
}: {
  notification: MyNotification;
  language: ResolvedLanguage;
  isPending: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const labels = NOTIFICATION_LABELS[language];

  const unread = notification.readAt === null;
  const isSocial = SOCIAL_TYPES.has(notification.type);
  const href = getNotificationHref(notification);
  const clickable = Boolean(href) || unread;

  const preview = getNotificationPreview(notification);
  const { title, message } = getNotificationText(notification, language);

  const createdAt = new Date(notification.createdAt);
  const dateTime = Number.isFinite(createdAt.getTime())
    ? createdAt.toISOString()
    : undefined;

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  return (
    <li
      className={`
        group/row flex w-full touch-pan-y
        items-stretch overflow-hidden
        ${unread ? "bg-zinc-50/80 dark:bg-zinc-800/20" : ""}
      `}
      onTouchStart={(event) => {
        if (
          !isSocial ||
          !window.matchMedia(SMALL_TOUCH_QUERY).matches ||
          event.touches.length !== 1
        ) {
          swipeStart.current = null;
          return;
        }

        const touch = event.touches[0];

        swipeStart.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }}
      onTouchEnd={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;

        if (!start) {
          return;
        }

        const touch = event.changedTouches[0];

        if (!touch) {
          return;
        }

        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;

        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) {
          return;
        }

        suppressClickUntil.current = Date.now() + 500;

        if (dx > 0) {
          onOpen();
        } else {
          onClose();
        }
      }}
      onTouchCancel={() => {
        swipeStart.current = null;
      }}
      onClickCapture={(event) => {
        if (event.detail !== 0 && Date.now() < suppressClickUntil.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const target = event.target;

        if (
          isOpen &&
          target instanceof Element &&
          !target.closest("[data-notification-delete]")
        ) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className="
          flex min-w-0 flex-1 gap-3
          px-4 py-4 text-start transition-colors
          enabled:cursor-pointer
          enabled:hover:bg-zinc-50
          dark:enabled:hover:bg-zinc-800/40
          disabled:cursor-default
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-inset
          focus-visible:ring-zinc-400
        "
      >
        <span className="flex shrink-0 items-start justify-center">
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
        <div
          className={`
            order-last flex shrink-0 overflow-hidden
            transition-[width,opacity] duration-200 ease-out
            motion-reduce:transition-none

            ${isOpen ? "w-10 opacity-100" : "w-0 opacity-0"}

            [@media(max-width:767px)_and_(hover:none)_and_(pointer:coarse)]:order-first

            [@media(hover:hover)_and_(pointer:fine)]:group-hover/row:w-10
            [@media(hover:hover)_and_(pointer:fine)]:group-hover/row:opacity-100

            group-has-focus-visible/row:w-10
            group-has-focus-visible/row:opacity-100

            [@media(hover:none)_and_(min-width:768px)]:w-10
            [@media(hover:none)_and_(min-width:768px)]:opacity-100
          `}
        >
          <button
            data-notification-delete
            type="button"
            disabled={isPending}
            aria-label={`${labels.delete}: ${title}`}
            title={labels.delete}
            onClick={onDelete}
            className="
              flex w-10 shrink-0 cursor-pointer
              items-center justify-center self-stretch
              bg-red-500 text-white
              transition-colors
              hover:bg-red-600 active:bg-red-700
              disabled:cursor-default disabled:bg-red-400
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-inset
              focus-visible:ring-white
              dark:bg-red-600 dark:hover:bg-red-700
              dark:disabled:bg-red-500
            "
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
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
    case "TIER_UP":
    case "TIER_DOWN": {
      // Older notifications may not have a stored tier.
      if (!notification.tier) {
        return {
          title: notification.title,
          message: notification.message,
        };
      }

      const tierName = NOTIFICATION_TIER_NAMES[notification.tier];

      const template =
        notification.type === "TIER_UP" ? labels.tier_up : labels.tier_down;

      return {
        title: template.replace("{tier}", () => tierName),
        message: null,
      };
    }
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

function NotificationIcon({ type }: { type: MyNotification["type"] }) {
  const Icon = (() => {
    switch (type) {
      case "COMMENT_LIKED":
      case "REPLY_LIKED":
        return FcLikePlaceholder;

      case "COMMENT_REPLIED":
      case "REPLY_REPLIED":
        return FcAbout;

      case "COMMENT_REPORTED":
      case "REPLY_REPORTED":
        return FcHighPriority;

      case "PREDICTION_WON":
        return FcApproval;

      case "PREDICTION_LOST":
        return FcBearish;

      case "PREDICTION_PENDING":
        return FcOvertime;

      case "TIER_UP":
      case "TIER_DOWN":
      case "PREDICTION_DRAW":
      case "PREDICTION_VOID":
      default:
        return FcIdea;
    }
  })();

  return <Icon className="size-5.5 shrink-0" aria-hidden="true" />;
}

function NotificationLoader({ labels }: { labels: PanelLabels }) {
  return (
    <div
      role="status"
      className="flex h-full min-h-0 items-center justify-center"
    >
      <span
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
