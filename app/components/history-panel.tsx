// app/components/history-panel.tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { useRouter } from "next/navigation";

import { History, X } from "lucide-react";
import { BiSolidChat, BiSolidPencil } from "react-icons/bi";

import {
  RiDeleteBin6Fill,
  RiHeartFill,
  RiStarFill,
  RiUserHeartLine,
  RiUserUnfollowLine,
} from "react-icons/ri";

import { TbClipboardCheckFilled, TbFlagFilled } from "react-icons/tb";

import { Checkbox } from "@/components/ui/checkbox";
import { LoadMoreButton } from "@/app/components/load-more-button";

import {
  getUserActivities,
  type HistoryActivity,
  type HistoryCursor,
} from "@/app/actions/history";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";

import {
  HISTORY_LABELS,
  HISTORY_FILTER_LABELS,
  HISTORY_CLICK_LABELS,
  DATE_SECTION_LABELS,
  type DateSectionKey,
} from "@/lib/data/translations";

import { formatTimeAgo } from "@/lib/utils/format-time-ago";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type ResolvedLanguage = ReturnType<typeof resolveLanguage>;
type HistoryError = "load_failed" | "load_more_failed";

interface HistoryPanelProps {
  refreshKey: number;
  setOnHistory: Dispatch<SetStateAction<boolean>>;
  currentUser: {
    id: string;
    language?: string | null;
  } | null;
}

interface HistoryPanelContentProps extends HistoryPanelProps {
  predictionsOnly: boolean;
  onPredictionsOnlyChange: (checked: boolean) => void;
}

// -----------------------------------------------------------------------------
// CLIENT CACHE
// -----------------------------------------------------------------------------

const HISTORY_CACHE_TIME = 30 * 1000;

interface HistoryCacheEntry {
  userId: string;
  activities: HistoryActivity[];
  cursor: HistoryCursor | null;
  fetchedAt: number;
  refreshKey: number;
}

const historyCache = new Map<string, HistoryCacheEntry>();

function getHistoryCacheKey(userId: string, predictionsOnly: boolean) {
  return JSON.stringify([userId, predictionsOnly ? "predictions" : "all"]);
}

// -----------------------------------------------------------------------------
// DATE GROUPING
// -----------------------------------------------------------------------------

const SECTION_ORDER: DateSectionKey[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "earlier",
];

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

  const sortedActivities = [...activities].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    return (
      (Number.isFinite(bTime) ? bTime : 0) -
        (Number.isFinite(aTime) ? aTime : 0) || b.id.localeCompare(a.id)
    );
  });

  for (const activity of sortedActivities) {
    const timestamp = new Date(activity.createdAt).getTime();

    let section: DateSectionKey;

    if (!Number.isFinite(timestamp)) {
      section = "earlier";
    } else if (timestamp >= today.getTime()) {
      section = "today";
    } else if (timestamp >= yesterday.getTime()) {
      section = "yesterday";
    } else if (timestamp >= thisWeek.getTime()) {
      section = "this_week";
    } else if (timestamp >= lastWeek.getTime()) {
      section = "last_week";
    } else if (timestamp >= thisMonth.getTime()) {
      section = "this_month";
    } else {
      section = "earlier";
    }

    groups[section].push(activity);
  }

  return SECTION_ORDER.map((key) => ({
    key,
    activities: groups[key],
  })).filter((section) => section.activities.length > 0);
}

// -----------------------------------------------------------------------------
// PANEL
// -----------------------------------------------------------------------------

export function HistoryPanel({
  refreshKey,
  setOnHistory,
  currentUser,
}: HistoryPanelProps) {
  const userId = currentUser?.id;

  const [filter, setFilter] = useState({
    userId,
    predictionsOnly: false,
  });

  const predictionsOnly = filter.userId === userId && filter.predictionsOnly;

  useEffect(() => {
    for (const [key, entry] of historyCache) {
      if (entry.userId !== userId) {
        historyCache.delete(key);
      }
    }
  }, [userId]);

  return (
    <HistoryPanelContent
      key={JSON.stringify([userId ?? "guest", predictionsOnly])}
      refreshKey={refreshKey}
      setOnHistory={setOnHistory}
      currentUser={currentUser}
      predictionsOnly={predictionsOnly}
      onPredictionsOnlyChange={(checked) => {
        setFilter({
          userId,
          predictionsOnly: checked,
        });
      }}
    />
  );
}

function HistoryPanelContent({
  refreshKey,
  setOnHistory,
  currentUser,
  predictionsOnly,
  onPredictionsOnlyChange,
}: HistoryPanelContentProps) {
  const router = useRouter();
  const userId = currentUser?.id;

  const language = resolveLanguage(currentUser?.language);

  const labels = HISTORY_LABELS[language];
  const filterLabels = HISTORY_FILTER_LABELS[language];
  const clickLabels = HISTORY_CLICK_LABELS[language];
  const sectionLabels = DATE_SECTION_LABELS[language];

  const cacheKey = userId ? getHistoryCacheKey(userId, predictionsOnly) : null;

  const [initialCache] = useState(() =>
    cacheKey ? historyCache.get(cacheKey) : undefined,
  );

  const [activities, setActivities] = useState<HistoryActivity[]>(
    () => initialCache?.activities ?? [],
  );

  const [cursor, setCursor] = useState<HistoryCursor | null>(
    () => initialCache?.cursor ?? null,
  );

  const [loading, setLoading] = useState(() =>
    Boolean(userId && !initialCache),
  );

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<HistoryError | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [sectionNow, setSectionNow] = useState(() => new Date());

  const requestVersion = useRef(0);
  const moreRequest = useRef(false);

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
  // LOAD / BACKGROUND REFRESH
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

    const isFresh =
      cached !== undefined &&
      cached.refreshKey === refreshKey &&
      Date.now() - cached.fetchedAt < HISTORY_CACHE_TIME;

    if (isFresh && retryKey === 0) {
      setRefreshing(false);

      return () => {
        cancelled = true;
        requestVersion.current++;
      };
    }

    setRefreshing(Boolean(cached));

    async function load() {
      try {
        const result = await getUserActivities(null, predictionsOnly);

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
        setError(null);
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
  }, [userId, cacheKey, predictionsOnly, refreshKey, retryKey]);

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
      moreRequest.current
    ) {
      return;
    }

    const version = requestVersion.current;

    moreRequest.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const result = await getUserActivities(cursor, predictionsOnly);

      if (version !== requestVersion.current) {
        return;
      }

      const existingIds = new Set(activities.map((activity) => activity.id));

      const mergedActivities = [
        ...activities,
        ...result.activities.filter(
          (activity) => !existingIds.has(activity.id),
        ),
      ];

      const cached = historyCache.get(cacheKey);

      historyCache.set(cacheKey, {
        userId,
        activities: mergedActivities,
        cursor: result.nextCursor,
        fetchedAt: cached?.fetchedAt ?? 0,
        refreshKey: cached?.refreshKey ?? refreshKey,
      });

      setActivities(mergedActivities);
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
  // CLICK
  // ---------------------------------------------------------------------------

  function handleActivityClick(activity: HistoryActivity) {
    if (activity.type === "COMMENT_DELETED") {
      window.alert(clickLabels.comment_deleted);
      return;
    }

    if (activity.type === "REPLY_DELETED") {
      window.alert(clickLabels.reply_deleted);
      return;
    }

    if (activity.href) {
      router.push(activity.href);
      return;
    }

    window.alert(clickLabels.unavailable);
  }

  const activitySections = groupHistoryActivities(activities, sectionNow);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <section className="flex h-full min-h-0 flex-col text-zinc-800 dark:text-zinc-300">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1.5">
        <h2 className="sr-only">{labels.title}</h2>

        <div className="flex min-w-0 items-center gap-0.5">
          <p className="mr-1 truncate text-xs font-normal tracking-wider text-muted-foreground/50">
            {labels.title}
          </p>

          <span aria-hidden="true" className="text-muted-foreground/50">
            ·
          </span>

          <label
            className="
              flex min-w-0 cursor-pointer items-center gap-1.5
              rounded-md px-1 py-2
              text-xs font-normal tracking-wider
              text-muted-foreground/50
            "
          >
            <span className="whitespace-nowrap">
              {filterLabels.predictions_only}
            </span>

            <Checkbox
              checked={predictionsOnly}
              aria-label={filterLabels.predictions_only}
              onCheckedChange={(checked) => {
                onPredictionsOnlyChange(checked === true);
              }}
              className="
                size-3.5 shrink-0 cursor-pointer rounded-[3px]
                border-zinc-300 shadow-none
                data-[state=checked]:border-zinc-800
                data-[state=checked]:bg-zinc-800
                data-[state=checked]:text-white
                dark:border-zinc-600
                dark:data-[state=checked]:border-zinc-300
                dark:data-[state=checked]:bg-zinc-300
                dark:data-[state=checked]:text-zinc-900
              "
            />
          </label>
        </div>

        <button
          type="button"
          aria-label={labels.close}
          onClick={() => setOnHistory(false)}
          className="
            flex size-8 shrink-0 cursor-pointer
            items-center justify-center rounded-md
            text-zinc-500 transition-colors
            hover:bg-zinc-100 hover:text-zinc-900
            dark:text-zinc-400 dark:hover:bg-zinc-800
            dark:hover:text-zinc-100
          "
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <HistoryLoader labels={labels} />
        ) : !currentUser ? (
          <EmptyHistory message={labels.login_required} />
        ) : activities.length === 0 && !error ? (
          <EmptyHistory
            message={predictionsOnly ? filterLabels.empty : labels.empty}
          />
        ) : (
          <div className="">
            {activitySections.map((section) => (
              <section key={section.key}>
                {section.key !== "today" && (
                  <h3
                    className="
                      mx-3 rounded-md border border-zinc-300/50
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
                  {section.activities.map((activity) => (
                    <li key={activity.id}>
                      <button
                        type="button"
                        onClick={() => handleActivityClick(activity)}
                        className="
                          group flex w-full cursor-pointer gap-3
                          px-4 py-4 text-start transition-colors
                          hover:bg-zinc-50
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-inset
                          focus-visible:ring-zinc-400
                          dark:hover:bg-zinc-800/40
                        "
                      >
                        <span className="flex shrink-0 items-start justify-center">
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
                            className="mt-1.5 block truncate text-xs text-zinc-400 dark:text-zinc-500"
                          >
                            {formatTimeAgo(activity.createdAt, language)}
                          </time>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {refreshing && (
          <span role="status" className="sr-only">
            {labels.loading}
          </span>
        )}

        {error && (
          <div className="px-4 py-4 text-center" role="alert">
            <p className="text-sm text-rose-500">{labels[error]}</p>

            <button
              type="button"
              disabled={loading || refreshing || loadingMore}
              onClick={() => {
                if (error === "load_more_failed" && cursor) {
                  void loadMore();
                } else {
                  setRetryKey((value) => value + 1);
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
          <LoadMoreButton
            loading={loadingMore}
            loadingLabel={labels.loading}
            label={labels.load_more}
            onClick={() => void loadMore()}
          />
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// LOADER
// -----------------------------------------------------------------------------

function HistoryLoader({ labels }: { labels: { loading: string } }) {
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
// ICON
// -----------------------------------------------------------------------------

function ActivityIcon({ type }: { type: HistoryActivity["type"] }) {
  const className = `
    mt-0.75 size-4 text-zinc-400
    group-hover:text-zinc-500
    dark:text-zinc-400 dark:group-hover:text-zinc-300
  `;

  switch (type) {
    case "COMMENT_LIKED":
    case "COMMENT_UNLIKED":
    case "REPLY_LIKED":
    case "REPLY_UNLIKED":
      return <RiHeartFill className={className} aria-hidden="true" />;

    case "COMMENT_EDITED":
    case "REPLY_EDITED":
      return <BiSolidPencil className={className} aria-hidden="true" />;

    case "COMMENT_DELETED":
    case "REPLY_DELETED":
      return <RiDeleteBin6Fill className={className} aria-hidden="true" />;

    case "COMMENT_REPORTED":
    case "REPLY_REPORTED":
      return <TbFlagFilled className={className} aria-hidden="true" />;

    case "WATCHLIST_ADDED":
    case "WATCHLIST_REMOVED":
      return <RiStarFill className={className} aria-hidden="true" />;

    case "USER_FOLLOWED":
      return <RiUserHeartLine className={className} aria-hidden="true" />;

    case "USER_UNFOLLOWED":
      return <RiUserUnfollowLine className={className} aria-hidden="true" />;

    case "PREDICTION_SUBMITTED":
      return (
        <TbClipboardCheckFilled className={className} aria-hidden="true" />
      );

    default:
      return <BiSolidChat className={className} aria-hidden="true" />;
  }
}

// -----------------------------------------------------------------------------
// DETAIL
// -----------------------------------------------------------------------------

function getActivityDetail(
  activity: HistoryActivity,
  language: ResolvedLanguage,
) {
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

// -----------------------------------------------------------------------------
// EMPTY STATE
// -----------------------------------------------------------------------------

function EmptyHistory({ message }: { message: string }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
      <History
        className="mb-3 size-6 text-zinc-300 dark:text-zinc-700"
        aria-hidden="true"
      />

      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}
