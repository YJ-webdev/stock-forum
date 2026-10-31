// app/components/history-panel.tsx

"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  FcBookmark,
  FcBrokenLink,
  FcFullTrash,
  FcInspection,
  FcLikePlaceholder,
  FcLink,
  FcSms,
  FcUndo,
  FcVoicePresentation,
} from "react-icons/fc";

import { useRouter } from "next/navigation";
import { History, X } from "lucide-react";

import { toast } from "sonner";

import { LoadMoreButton } from "@/app/components/load-more-button";

import {
  deleteUserActivity,
  getUserActivities,
  type HistoryActivity,
  type HistoryCursor,
} from "@/app/actions/history";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";

import {
  HISTORY_LABELS,
  HISTORY_CLICK_LABELS,
  DATE_SECTION_LABELS,
  NOTIFICATION_LABELS,
  type DateSectionKey,
} from "@/lib/data/translations";

import { formatTimeAgo } from "@/lib/utils/format-time-ago";

// -----------------------------------------------------------------------------
// TYPES / CONSTANTS
// -----------------------------------------------------------------------------

type Language = ReturnType<typeof resolveLanguage>;
type HistoryError = "load_failed" | "load_more_failed";

interface HistoryPanelProps {
  onNavigate?: () => void;
  refreshKey: number;
  setOnHistory: Dispatch<SetStateAction<boolean>>;
  currentUser: {
    id: string;
    language?: string | null;
  } | null;
}

interface HistoryCacheEntry {
  userId: string;
  activities: HistoryActivity[];
  cursor: HistoryCursor | null;
  fetchedAt: number;
  refreshKey: number;
}

interface SectionRequest {
  key: DateSectionKey;
  opening: boolean;
}

const HISTORY_CACHE_TIME = 30_000;

const SMALL_TOUCH_QUERY =
  "(max-width: 767px) and (hover: none) and (pointer: coarse)";

const UNCLICKABLE_TYPES: readonly HistoryActivity["type"][] = [
  "USER_FOLLOWED",
  "USER_UNFOLLOWED",
  "COMMENT_DELETED",
  "REPLY_DELETED",
];

const SECTION_ORDER: DateSectionKey[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "earlier",
];

const DELETE_FAILED: Record<Language, string> = {
  en: "Failed to delete activity.",
  ko: "기록을 삭제하지 못했습니다.",
  ja: "履歴を削除できませんでした。",
  zh: "无法删除记录。",
  de: "Der Eintrag konnte nicht gelöscht werden.",
  fr: "Impossible de supprimer cette activité.",
  es: "No se pudo eliminar la actividad.",
  pt: "Não foi possível excluir a atividade.",
  it: "Impossibile eliminare l’attività.",
  ru: "Не удалось удалить запись.",
  ar: "تعذر حذف النشاط.",
  hi: "गतिविधि हटाई नहीं जा सकी।",
};

const historyCache = new Map<string, HistoryCacheEntry>();

// -----------------------------------------------------------------------------
// DATE GROUPING
// -----------------------------------------------------------------------------

function groupHistoryActivities(activities: HistoryActivity[], now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - ((thisWeek.getDay() + 6) % 7));

  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const groups: Record<DateSectionKey, HistoryActivity[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    last_week: [],
    this_month: [],
    earlier: [],
  };

  const sorted = [...activities].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    return (
      (Number.isFinite(bTime) ? bTime : 0) -
        (Number.isFinite(aTime) ? aTime : 0) || b.id.localeCompare(a.id)
    );
  });

  for (const activity of sorted) {
    const time = new Date(activity.createdAt).getTime();

    const key: DateSectionKey = !Number.isFinite(time)
      ? "earlier"
      : time >= today.getTime()
        ? "today"
        : time >= yesterday.getTime()
          ? "yesterday"
          : time >= thisWeek.getTime()
            ? "this_week"
            : time >= lastWeek.getTime()
              ? "last_week"
              : time >= thisMonth.getTime()
                ? "this_month"
                : "earlier";

    groups[key].push(activity);
  }

  return SECTION_ORDER.map((key) => ({
    key,
    activities: groups[key],
  })).filter((section) => section.activities.length > 0);
}

// -----------------------------------------------------------------------------
// PANEL
// -----------------------------------------------------------------------------

export function HistoryPanel(props: HistoryPanelProps) {
  const userId = props.currentUser?.id;

  useEffect(() => {
    for (const [key, entry] of historyCache) {
      if (entry.userId !== userId) {
        historyCache.delete(key);
      }
    }
  }, [userId]);

  return <HistoryPanelContent key={userId ?? "guest"} {...props} />;
}

function HistoryPanelContent({
  refreshKey,
  setOnHistory,
  currentUser,
  onNavigate,
}: HistoryPanelProps) {
  const router = useRouter();
  const userId = currentUser?.id;
  const language = resolveLanguage(currentUser?.language);

  const labels = HISTORY_LABELS[language];
  const clickLabels = HISTORY_CLICK_LABELS[language];
  const sectionLabels = DATE_SECTION_LABELS[language];
  const deleteLabel = NOTIFICATION_LABELS[language].delete;

  const cacheKey = userId ? JSON.stringify([userId, "all"]) : null;

  const [initialCache] = useState(() =>
    cacheKey ? historyCache.get(cacheKey) : undefined,
  );

  const [activities, setActivities] = useState<HistoryActivity[]>(
    initialCache?.activities ?? [],
  );

  const [cursor, setCursor] = useState<HistoryCursor | null>(
    initialCache?.cursor ?? null,
  );

  const [loading, setLoading] = useState(Boolean(userId && !initialCache));

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<HistoryError | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [sectionNow, setSectionNow] = useState(() => new Date());

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [swipedActivityId, setSwipedActivityId] = useState<string | null>(null);

  const [collapsedSections, setCollapsedSections] = useState<
    Partial<Record<DateSectionKey, boolean>>
  >({});

  const [sectionRequest, setSectionRequest] = useState<SectionRequest | null>(
    null,
  );

  const [headerHeights, setHeaderHeights] = useState<
    Partial<Record<DateSectionKey, number>>
  >({});

  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const moreRequest = useRef(false);
  const deleteRequest = useRef(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const headerRefs = useRef<
    Partial<Record<DateSectionKey, HTMLHeadingElement | null>>
  >({});

  const recordStartRefs = useRef<
    Partial<Record<DateSectionKey, HTMLDivElement | null>>
  >({});

  const swipeStart = useRef<{
    activityId: string;
    x: number;
    y: number;
  } | null>(null);

  const suppressClickUntil = useRef(0);

  const activitySections = groupHistoryActivities(activities, sectionNow);

  const sectionSignature = activitySections
    .map((section) => section.key)
    .join(",");

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
    const update = () => setSectionNow(new Date());
    const timer = window.setInterval(update, 60_000);

    window.addEventListener("focus", update);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const version = ++requestVersion.current;
    let cancelled = false;

    moreRequest.current = false;
    setLoadingMore(false);
    setError(null);

    if (!userId || !cacheKey) {
      setActivities([]);
      setCursor(null);
      setLoading(false);
      setRefreshing(false);

      return () => {
        cancelled = true;
        requestVersion.current++;
      };
    }

    const requestUserId = userId;
    const requestCacheKey = cacheKey;
    const cached = historyCache.get(requestCacheKey);

    if (cached) {
      setActivities(cached.activities);
      setCursor(cached.cursor);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fresh =
      cached !== undefined &&
      cached.refreshKey === refreshKey &&
      Date.now() - cached.fetchedAt < HISTORY_CACHE_TIME;

    if (fresh && retryKey === 0) {
      setRefreshing(false);

      return () => {
        cancelled = true;
        requestVersion.current++;
      };
    }

    setRefreshing(Boolean(cached));

    async function load() {
      try {
        const result = await getUserActivities(null, false);

        if (cancelled || version !== requestVersion.current) {
          return;
        }

        historyCache.set(requestCacheKey, {
          userId: requestUserId,
          activities: result.activities,
          cursor: result.nextCursor,
          fetchedAt: Date.now(),
          refreshKey,
        });

        setActivities(result.activities);
        setCursor(result.nextCursor);
      } catch {
        if (!cancelled && version === requestVersion.current) {
          setError("load_failed");
        }
      } finally {
        if (!cancelled && version === requestVersion.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      requestVersion.current++;
    };
  }, [userId, cacheKey, refreshKey, retryKey]);

  // ---------------------------------------------------------------------------
  // LOAD MORE
  // ---------------------------------------------------------------------------

  async function loadMore() {
    if (
      !userId ||
      !cacheKey ||
      !cursor ||
      loading ||
      refreshing ||
      moreRequest.current ||
      deleteRequest.current
    ) {
      return;
    }

    const version = requestVersion.current;

    moreRequest.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const result = await getUserActivities(cursor, false);

      if (version !== requestVersion.current) {
        return;
      }

      const existingIds = new Set(activities.map((item) => item.id));

      const next = [
        ...activities,
        ...result.activities.filter((item) => !existingIds.has(item.id)),
      ];

      const cached = historyCache.get(cacheKey);

      historyCache.set(cacheKey, {
        userId,
        activities: next,
        cursor: result.nextCursor,
        fetchedAt: cached?.fetchedAt ?? 0,
        refreshKey: cached?.refreshKey ?? refreshKey,
      });

      setActivities(next);
      setCursor(result.nextCursor);
    } catch {
      if (version === requestVersion.current) {
        setError("load_more_failed");
      }
    } finally {
      if (version === requestVersion.current) {
        moreRequest.current = false;
        setLoadingMore(false);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  async function handleDeleteActivity(activityId: string) {
    if (
      !userId ||
      loading ||
      refreshing ||
      moreRequest.current ||
      deleteRequest.current
    ) {
      return;
    }

    deleteRequest.current = true;
    setDeletingId(activityId);

    try {
      await deleteUserActivity(activityId);

      for (const [key, entry] of historyCache) {
        if (entry.userId !== userId) {
          continue;
        }

        historyCache.set(key, {
          ...entry,
          activities: entry.activities.filter(
            (activity) => activity.id !== activityId,
          ),
          fetchedAt: 0,
        });
      }

      if (mounted.current) {
        setActivities((current) =>
          current.filter((activity) => activity.id !== activityId),
        );

        setSwipedActivityId((current) =>
          current === activityId ? null : current,
        );
      }
    } catch {
      toast.error(DELETE_FAILED[language]);
    } finally {
      deleteRequest.current = false;

      if (mounted.current) {
        setDeletingId(null);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HEADER MEASUREMENT
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

        const computed = window.getComputedStyle(header);
        const height = Number.parseFloat(computed.height);

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
    return activitySections
      .slice(0, index)
      .reduce((total, section) => total + getHeaderHeight(section.key), 0);
  }

  function handlePeriodClick(key: DateSectionKey) {
    const index = activitySections.findIndex((section) => section.key === key);

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

      // 첫 기록이 sticky 제목들 위로 넘어갔는지 확인.
      scrolledPastStart = start.getBoundingClientRect().top < recordsTop - 2;
    }

    // 접혀 있으면 펼침.
    // 펼쳐져 있지만 시작 위치를 지나쳤으면 시작으로 이동.
    // 펼쳐져 있고 시작 위치가 보이면 닫음.
    const opening = collapsed || scrolledPastStart;

    setSwipedActivityId(null);

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

  function handleActivityClick(activity: HistoryActivity) {
    if (UNCLICKABLE_TYPES.includes(activity.type)) {
      return;
    }

    if (activity.href) {
      router.push(activity.href);
      onNavigate?.();
    } else {
      window.alert(clickLabels.reply_deleted);
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <section
      aria-label={labels.title}
      className="
        relative flex h-full min-h-0 flex-col
        text-zinc-800 dark:text-zinc-100
      "
    >
      <button
        type="button"
        aria-label={labels.close}
        onClick={() => setOnHistory(false)}
        className="
          absolute right-1 top-0.5 z-50
          flex size-8 cursor-pointer items-center justify-center
           text-zinc-500
          transition-colors  hover:text-zinc-900
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-zinc-400
           dark:text-zinc-400
           dark:hover:text-zinc-100
        "
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      <div
        ref={scrollRef}
        className="
          relative min-h-0 flex-1 overflow-y-auto
          [overflow-anchor:none]
        "
      >
        {loading ? (
          <HistoryLoader message={labels.loading} />
        ) : !currentUser ? (
          <EmptyHistory message={labels.login_required} />
        ) : activities.length === 0 && !error ? (
          <EmptyHistory message={labels.empty} />
        ) : (
          <>
            {activitySections.map((section, index) => {
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
                      aria-controls={`history-records-${section.key}`}
                      onClick={() => handlePeriodClick(section.key)}
                      className="
  block w-full cursor-pointer
  bg-zinc-100 py-2.5 pl-4 pr-11 text-start
  text-xs font-medium text-zinc-500
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-inset
  focus-visible:ring-zinc-400
  dark:bg-zinc-800 dark:text-zinc-100
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
                    id={`history-records-${section.key}`}
                    hidden={collapsed}
                    className="
                      m-0 list-none p-0
                      divide-y divide-zinc-100 dark:divide-zinc-800
                    "
                  >
                    {section.activities.map((activity) => {
                      const open = swipedActivityId === activity.id;
                      const deleting = deletingId === activity.id;

                      return (
                        <li
                          key={activity.id}
                          className="
                            group/row flex touch-pan-y
                            items-stretch overflow-hidden
                          "
                          onTouchStart={(event) => {
                            if (
                              !window.matchMedia(SMALL_TOUCH_QUERY).matches ||
                              event.touches.length !== 1
                            ) {
                              swipeStart.current = null;
                              return;
                            }

                            const touch = event.touches[0];

                            swipeStart.current = {
                              activityId: activity.id,
                              x: touch.clientX,
                              y: touch.clientY,
                            };
                          }}
                          onTouchEnd={(event) => {
                            const start = swipeStart.current;
                            swipeStart.current = null;

                            if (!start || start.activityId !== activity.id) {
                              return;
                            }

                            const touch = event.changedTouches[0];

                            if (!touch) {
                              return;
                            }

                            const dx = touch.clientX - start.x;
                            const dy = touch.clientY - start.y;

                            if (
                              Math.abs(dx) < 40 ||
                              Math.abs(dx) < Math.abs(dy) * 1.5
                            ) {
                              return;
                            }

                            suppressClickUntil.current = Date.now() + 500;

                            if (dx > 0) {
                              setSwipedActivityId(activity.id);
                            } else {
                              setSwipedActivityId((current) =>
                                current === activity.id ? null : current,
                              );
                            }
                          }}
                          onTouchCancel={() => {
                            swipeStart.current = null;
                          }}
                          onClickCapture={(event) => {
                            if (
                              event.detail !== 0 &&
                              Date.now() < suppressClickUntil.current
                            ) {
                              event.preventDefault();
                              event.stopPropagation();
                              return;
                            }

                            const target = event.target;

                            if (
                              open &&
                              target instanceof Element &&
                              !target.closest("[data-history-delete]")
                            ) {
                              event.preventDefault();
                              event.stopPropagation();
                              setSwipedActivityId(null);
                            }
                          }}
                        >
                          <button
                            type="button"
                            disabled={UNCLICKABLE_TYPES.includes(activity.type)}
                            onClick={() => handleActivityClick(activity)}
                            className="
                              group flex min-w-0 flex-1 gap-3
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
                            <span className="flex shrink-0 items-start">
                              <ActivityIcon type={activity.type} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-medium">
                                {labels.activities[activity.type]}
                              </span>

                              <span className="mt-1 block truncate text-sm text-zinc-500 dark:text-zinc-400">
                                {getActivityDetail(activity, language)}
                              </span>

                              <time
                                dateTime={activity.createdAt}
                                className="
                                  mt-1.5 block truncate text-xs
                                  text-zinc-400 dark:text-zinc-500
                                "
                              >
                                {formatTimeAgo(
                                  activity.createdAt,
                                  language,
                                  undefined,
                                  sectionNow.getTime(),
                                )}
                              </time>
                            </span>
                          </button>

                          <div
                            className={`
                              order-last flex shrink-0 overflow-hidden
                              transition-[width,opacity] duration-200 ease-out
                              motion-reduce:transition-none

                              ${
                                open || deleting
                                  ? "w-10 opacity-100"
                                  : "w-0 opacity-0"
                              }

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
                              data-history-delete
                              type="button"
                              disabled={
                                refreshing || loadingMore || deletingId !== null
                              }
                              aria-label={`${deleteLabel}: ${labels.activities[activity.type]}`}
                              title={deleteLabel}
                              aria-busy={deleting}
                              onClick={() =>
                                void handleDeleteActivity(activity.id)
                              }
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
                              {deleting ? (
                                <span
                                  aria-hidden="true"
                                  className="
                                    size-4 animate-spin rounded-full
                                    border-2 border-white/40 border-t-white
                                  "
                                />
                              ) : (
                                <X className="size-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Fragment>
              );
            })}
          </>
        )}

        {refreshing && (
          <span role="status" className="sr-only">
            {labels.loading}
          </span>
        )}

        {error && (
          <div role="alert" className="px-4 py-4 text-center">
            <p className="text-sm text-rose-500">{labels[error]}</p>

            <button
              type="button"
              disabled={
                loading || refreshing || loadingMore || deletingId !== null
              }
              onClick={() => {
                if (error === "load_more_failed" && cursor) {
                  void loadMore();
                } else {
                  setRetryKey((current) => current + 1);
                }
              }}
              className="
                mt-2 cursor-pointer text-sm underline
                disabled:cursor-default disabled:opacity-50
              "
            >
              {labels.retry}
            </button>
          </div>
        )}

        {!loading && !refreshing && !error && cursor && (
          <div className="px-4 py-3">
            <LoadMoreButton
              loading={loadingMore}
              loadingLabel={labels.loading}
              label={labels.load_more}
              onClick={() => void loadMore()}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// LOADER / EMPTY
// -----------------------------------------------------------------------------

function HistoryLoader({ message }: { message: string }) {
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
      <span className="sr-only">{message}</span>
    </div>
  );
}

function EmptyHistory({ message }: { message: string }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
      <History
        aria-hidden="true"
        className="mb-3 size-6 text-zinc-100 dark:text-zinc-700"
      />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ICON
// -----------------------------------------------------------------------------

function ActivityIcon({ type }: { type: HistoryActivity["type"] }) {
  const Icon = (() => {
    switch (type) {
      case "COMMENT_LIKED":
      case "COMMENT_UNLIKED":
      case "REPLY_LIKED":
      case "REPLY_UNLIKED":
        return FcLikePlaceholder;

      case "COMMENT_EDITED":
      case "REPLY_EDITED":
        return FcUndo;

      case "COMMENT_DELETED":
      case "REPLY_DELETED":
        return FcFullTrash;

      case "COMMENT_REPORTED":
      case "REPLY_REPORTED":
        return FcVoicePresentation;

      case "WATCHLIST_ADDED":
      case "WATCHLIST_REMOVED":
        return FcBookmark;

      case "USER_FOLLOWED":
        return FcLink;

      case "USER_UNFOLLOWED":
        return FcBrokenLink;

      case "PREDICTION_SUBMITTED":
        return FcInspection;

      default:
        return FcSms;
    }
  })();

  return <Icon className="size-5.5 shrink-0" aria-hidden="true" />;
}

// -----------------------------------------------------------------------------
// DETAIL
// -----------------------------------------------------------------------------

function getActivityDetail(activity: HistoryActivity, language: Language) {
  const labels = HISTORY_LABELS[language];

  if (
    activity.type === "USER_FOLLOWED" ||
    activity.type === "USER_UNFOLLOWED"
  ) {
    return activity.targetUserName ?? labels.user;
  }

  const marketName =
    ALL_MARKET_SYMBOLS.find((market) => market.symbol === activity.marketSymbol)
      ?.name ??
    activity.marketSymbol ??
    labels.market;

  if (activity.type !== "PREDICTION_SUBMITTED") {
    return marketName;
  }

  const metadata =
    activity.metadata &&
    typeof activity.metadata === "object" &&
    !Array.isArray(activity.metadata)
      ? activity.metadata
      : {};

  const direction =
    metadata.direction === "BULL"
      ? labels.bull
      : metadata.direction === "BEAR"
        ? labels.bear
        : null;

  const points =
    typeof metadata.pointsBet === "number" &&
    Number.isFinite(metadata.pointsBet)
      ? labels.points.replace(
          "{points}",
          new Intl.NumberFormat(language).format(metadata.pointsBet),
        )
      : null;

  return [marketName, direction, points].filter(Boolean).join(" · ");
}
