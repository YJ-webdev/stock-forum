"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import Link from "next/link";

import {
  Bookmark,
  Flag,
  Heart,
  History,
  MessageSquare,
  Pencil,
  Trash2,
  TrendingUp,
  TriangleAlert,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

import {
  getUserActivities,
  type HistoryActivity,
  type HistoryCursor,
} from "@/app/actions/history";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";

interface HistoryPanelProps {
  refreshKey: number;
  setOnHistory: Dispatch<SetStateAction<boolean>>;
  currentUser: {
    id: string;
    language?: string | null;
  } | null;
}

const ACTIVITY_TITLES: Record<HistoryActivity["type"], string> = {
  COMMENT_CREATED: "Posted a comment",
  COMMENT_EDITED: "Edited a comment",
  COMMENT_DELETED: "Deleted a comment",
  REPLY_CREATED: "Posted a reply",
  REPLY_EDITED: "Edited a reply",
  REPLY_DELETED: "Deleted a reply",
  COMMENT_LIKED: "Liked a comment",
  COMMENT_UNLIKED: "Removed a comment like",
  REPLY_LIKED: "Liked a reply",
  REPLY_UNLIKED: "Removed a reply like",
  COMMENT_REPORTED: "Reported a comment",
  REPLY_REPORTED: "Reported a reply",
  PREDICTION_SUBMITTED: "Submitted a prediction",
  WATCHLIST_ADDED: "Added to watchlist",
  WATCHLIST_REMOVED: "Removed from watchlist",
  USER_FOLLOWED: "Followed a user",
  USER_UNFOLLOWED: "Unfollowed a user",
};

export function HistoryPanel({
  refreshKey,
  setOnHistory,
  currentUser,
}: HistoryPanelProps) {
  // Remount on account changes to avoid displaying another user's history.
  return (
    <HistoryPanelContent
      key={currentUser?.id ?? "guest"}
      refreshKey={refreshKey}
      setOnHistory={setOnHistory}
      currentUser={currentUser}
    />
  );
}

function HistoryPanelContent({
  refreshKey,
  setOnHistory,
  currentUser,
}: HistoryPanelProps) {
  const language = resolveLanguage(currentUser?.language);

  const [activities, setActivities] = useState<HistoryActivity[]>([]);
  const [cursor, setCursor] = useState<HistoryCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const requestVersion = useRef(0);
  const moreRequest = useRef(false);

  useEffect(() => {
    const version = ++requestVersion.current;
    let cancelled = false;

    moreRequest.current = false;
    setActivities([]);
    setCursor(null);
    setLoading(true);
    setLoadingMore(false);
    setError(null);

    if (!currentUser?.id) {
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    async function load() {
      try {
        const result = await getUserActivities();

        if (cancelled || version !== requestVersion.current) {
          return;
        }

        setActivities(result.activities);
        setCursor(result.nextCursor);
      } catch {
        if (!cancelled && version === requestVersion.current) {
          setError("Failed to load history.");
        }
      } finally {
        if (!cancelled && version === requestVersion.current) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      requestVersion.current++;
    };
  }, [currentUser?.id, refreshKey, retryKey]);

  async function loadMore() {
    if (!cursor || loading || moreRequest.current) {
      return;
    }

    const version = requestVersion.current;

    moreRequest.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const result = await getUserActivities(cursor);

      if (version !== requestVersion.current) {
        return;
      }

      setActivities((current) => {
        const existingIds = new Set(current.map((item) => item.id));

        return [
          ...current,
          ...result.activities.filter((item) => !existingIds.has(item.id)),
        ];
      });

      setCursor(result.nextCursor);
    } catch {
      if (version === requestVersion.current) {
        setError("Failed to load more history.");
      }
    } finally {
      if (version === requestVersion.current) {
        moreRequest.current = false;
        setLoadingMore(false);
      }
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col text-zinc-900 dark:text-zinc-100">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1.5">
        <h2 className="sr-only">History</h2>

        <p className="text-xs font-normal tracking-wider text-muted-foreground/50">
          Your activity from the last 30 days
        </p>

        <button
          type="button"
          aria-label="Close history"
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-5 px-4 py-5" aria-label="Loading history">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex animate-pulse gap-3">
                <div className="size-9 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800" />

                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : !currentUser ? (
          <EmptyHistory message="Log in to view your history." />
        ) : activities.length === 0 && !error ? (
          <EmptyHistory message="No activity in the last 30 days." />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {activities.map((activity) => {
              const content = (
                <>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <ActivityIcon type={activity.type} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">
                      {ACTIVITY_TITLES[activity.type]}
                    </span>

                    <span className="mt-1 block truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {getActivityDetail(activity)}
                    </span>

                    <time
                      dateTime={activity.createdAt}
                      className="mt-1.5 block text-xs text-zinc-400 dark:text-zinc-500"
                    >
                      {formatActivityTime(activity.createdAt, language)}
                    </time>
                  </span>
                </>
              );

              return (
                <li key={activity.id}>
                  {activity.href ? (
                    <Link
                      href={activity.href}
                      prefetch={false}
                      className="flex gap-3 px-4 py-4 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 dark:hover:bg-zinc-800/40"
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

        {error && (
          <div className="px-4 py-4 text-center" role="alert">
            <p className="text-sm text-rose-500">{error}</p>

            <button
              type="button"
              disabled={loadingMore}
              onClick={() => {
                if (activities.length > 0 && cursor) {
                  void loadMore();
                } else {
                  setRetryKey((value) => value + 1);
                }
              }}
              className="mt-2 cursor-pointer text-sm underline disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        )}

        {cursor && !error && (
          <div className="px-4 py-4">
            <button
              type="button"
              disabled={loading || loadingMore}
              onClick={() => void loadMore()}
              className="w-full cursor-pointer rounded-full border border-zinc-200 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 disabled:cursor-default disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityIcon({ type }: { type: HistoryActivity["type"] }) {
  const className = "size-4 text-zinc-500 dark:text-zinc-400";

  switch (type) {
    case "COMMENT_LIKED":
    case "COMMENT_UNLIKED":
    case "REPLY_LIKED":
    case "REPLY_UNLIKED":
      return <Heart className={className} aria-hidden="true" />;

    case "COMMENT_EDITED":
    case "REPLY_EDITED":
      return <Pencil className={className} aria-hidden="true" />;

    case "COMMENT_DELETED":
    case "REPLY_DELETED":
      return <Trash2 className={className} aria-hidden="true" />;

    case "COMMENT_REPORTED":
    case "REPLY_REPORTED":
      return <Flag className={className} aria-hidden="true" />;

    case "WATCHLIST_ADDED":
    case "WATCHLIST_REMOVED":
      return <Bookmark className={className} aria-hidden="true" />;

    case "USER_FOLLOWED":
      return <UserPlus className={className} aria-hidden="true" />;

    case "USER_UNFOLLOWED":
      return <UserMinus className={className} aria-hidden="true" />;

    case "PREDICTION_SUBMITTED":
      return <TrendingUp className={className} aria-hidden="true" />;

    default:
      return <MessageSquare className={className} aria-hidden="true" />;
  }
}

function getActivityDetail(activity: HistoryActivity) {
  if (
    activity.type === "USER_FOLLOWED" ||
    activity.type === "USER_UNFOLLOWED"
  ) {
    return activity.targetUserName ?? "User";
  }

  const marketName =
    ALL_MARKET_SYMBOLS.find((market) => market.symbol === activity.marketSymbol)
      ?.name ??
    activity.marketSymbol ??
    "Market";

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
      ? "Bull"
      : metadata.direction === "BEAR"
        ? "Bear"
        : null;

  const points =
    typeof metadata.pointsBet === "number"
      ? `${metadata.pointsBet} points`
      : null;

  return [marketName, direction, points].filter(Boolean).join(" · ");
}

function formatActivityTime(date: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

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
