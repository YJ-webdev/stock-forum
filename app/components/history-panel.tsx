"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import Link from "next/link";
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

import {
  getUserActivities,
  type HistoryActivity,
  type HistoryCursor,
} from "@/app/actions/history";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";
import { HISTORY_LABELS } from "@/lib/data/translations";

// -----------------------------------------------------------------------------
// FILTER LABELS
// -----------------------------------------------------------------------------

const HISTORY_FILTER_LABELS: Record<
  ReturnType<typeof resolveLanguage>,
  { predictions_only: string; empty: string }
> = {
  en: {
    predictions_only: "Predictions only",
    empty: "No predictions in the last 30 days.",
  },
  ko: {
    predictions_only: "예측만 보기",
    empty: "최근 30일간 예측 기록이 없습니다.",
  },
  ja: {
    predictions_only: "予測のみ",
    empty: "過去30日間の予測はありません。",
  },
  zh: {
    predictions_only: "仅看预测",
    empty: "最近30天没有预测记录。",
  },
  de: {
    predictions_only: "Nur Prognosen",
    empty: "Keine Prognosen in den letzten 30 Tagen.",
  },
  fr: {
    predictions_only: "Prévisions uniquement",
    empty: "Aucune prévision au cours des 30 derniers jours.",
  },
  es: {
    predictions_only: "Solo predicciones",
    empty: "No hay predicciones en los últimos 30 días.",
  },
  pt: {
    predictions_only: "Apenas previsões",
    empty: "Nenhuma previsão nos últimos 30 dias.",
  },
  it: {
    predictions_only: "Solo previsioni",
    empty: "Nessuna previsione negli ultimi 30 giorni.",
  },
  ru: {
    predictions_only: "Только прогнозы",
    empty: "Нет прогнозов за последние 30 дней.",
  },
  ar: {
    predictions_only: "التوقعات فقط",
    empty: "لا توجد توقعات خلال آخر 30 يومًا.",
  },
  hi: {
    predictions_only: "केवल पूर्वानुमान",
    empty: "पिछले 30 दिनों में कोई पूर्वानुमान नहीं है।",
  },
};

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
// TYPES
// -----------------------------------------------------------------------------

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

type HistoryError = "load_failed" | "load_more_failed";

// -----------------------------------------------------------------------------
// HISTORY PANEL
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
  const userId = currentUser?.id;

  const language = resolveLanguage(currentUser?.language);
  const labels = HISTORY_LABELS[language];
  const filterLabels = HISTORY_FILTER_LABELS[language];

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

  const requestVersion = useRef(0);
  const moreRequest = useRef(false);

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
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <section className="flex h-full min-h-0 flex-col text-zinc-800 dark:text-zinc-300">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1.5">
        <h2 className="sr-only">{labels.title}</h2>

        <p className="min-w-0 text-xs font-normal tracking-wider text-muted-foreground/50 truncate">
          {labels.description}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <label
            className="
              flex cursor-pointer items-center gap-1.5
              rounded-md px-1 py-2
              text-xs text-zinc-400 dark:text-zinc-500
            "
          >
            <input
              type="checkbox"
              checked={predictionsOnly}
              onChange={(event) => {
                onPredictionsOnlyChange(event.target.checked);
              }}
              className="
                size-3.5 shrink-0 cursor-pointer
                accent-zinc-800 dark:accent-zinc-200
              "
            />

            <span className="whitespace-nowrap">
              {filterLabels.predictions_only}
            </span>
          </label>

          <button
            type="button"
            aria-label={labels.close}
            onClick={() => setOnHistory(false)}
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
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {activities.map((activity) => {
              const content = (
                <>
                  <span className="flex shrink-0 items-start justify-center">
                    <ActivityIcon type={activity.type} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium truncate">
                      {labels.activities[activity.type]}
                    </span>

                    <span className="mt-1 block truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {getActivityDetail(activity, language)}
                    </span>

                    <time
                      dateTime={activity.createdAt}
                      className="mt-1.5 block text-xs text-zinc-400 dark:text-zinc-500 truncate"
                    >
                      {formatActivityTime(activity.createdAt, language)}
                    </time>
                  </span>
                </>
              );

              return (
                <li key={activity.id} className="pl-1">
                  {activity.href ? (
                    <Link
                      href={activity.href}
                      prefetch={false}
                      className="
                        flex gap-3 px-4 py-4 transition-colors
                        hover:bg-zinc-50
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-inset
                        focus-visible:ring-zinc-400
                        dark:hover:bg-zinc-800/40
                      "
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-4 py-4">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
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

        {cursor && !error && (
          <div className="px-4 py-4">
            <button
              type="button"
              disabled={loading || refreshing || loadingMore}
              onClick={() => void loadMore()}
              className="
                flex min-h-10 w-full cursor-pointer
                items-center justify-center rounded-full
                border border-zinc-200 px-4 py-2 text-sm
                transition-colors hover:bg-zinc-100
                disabled:cursor-default disabled:opacity-50
                dark:border-zinc-700 dark:hover:bg-zinc-800
              "
            >
              {loadingMore ? (
                <HistoryLoader labels={labels} />
              ) : (
                labels.load_more
              )}
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
// ACTIVITY ICON
// -----------------------------------------------------------------------------

function ActivityIcon({ type }: { type: HistoryActivity["type"] }) {
  const className = "size-4 text-zinc-500 dark:text-zinc-400";

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
// ACTIVITY DETAIL
// -----------------------------------------------------------------------------

function getActivityDetail(
  activity: HistoryActivity,
  language: ReturnType<typeof resolveLanguage>,
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
// ACTIVITY TIME
// -----------------------------------------------------------------------------

function formatActivityTime(date: string, language: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
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
