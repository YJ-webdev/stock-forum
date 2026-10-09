// app/components/home-community.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import {
  getHomeComments,
  type HomeComments,
  type HomeCommentCursor,
  type HomeCommentSort,
} from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { CommentItem } from "./comment";

interface HomeCommunityProps {
  initialComments: HomeComments;
  initialNextCursor: HomeCommentCursor | null;
  initialTotalCount: number;
  markets: {
    symbol: string;
    displaySymbol: string;
    name: string;
    commentCount: number;
  }[];
}

type Comment = HomeComments[number];

export function HomeCommunity({
  initialComments,
  initialNextCursor,
  initialTotalCount,
  markets,
}: HomeCommunityProps) {
  const user = useCurrentUser();
  const searchParams = useSearchParams();

  const targetCommentId = searchParams.get("comment");
  const targetReplyId = searchParams.get("reply");
  const from = searchParams.get("from");

  const [comments, setComments] = useState(initialComments);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  const [assetSymbol, setAssetSymbol] = useState<string | null>(null);
  const [sort, setSort] = useState<HomeCommentSort>("latest");

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const requestVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const initialViewerRef = useRef({
    id: user?.id ?? null,
    role: user?.role ?? null,
  });

  const viewerId = user?.id ?? null;
  const viewerRole = user?.role ?? null;

  const marketBySymbol = useMemo(
    () => new Map(ALL_MARKET_SYMBOLS.map((market) => [market.symbol, market])),
    [],
  );

  const filterMarkets = markets.slice(0, 5);

  const highlightTargetComment =
    Boolean(targetCommentId) && (from === "most-liked" || from === "report");

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    let cancelled = false;

    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoadError(false);

    const isCurrentRequest = () =>
      !cancelled && requestVersionRef.current === requestVersion;

    const cleanup = () => {
      cancelled = true;

      if (requestVersionRef.current === requestVersion) {
        requestVersionRef.current += 1;
      }
    };

    const useInitialPage =
      assetSymbol === null &&
      sort === "latest" &&
      reloadKey === 0 &&
      viewerId === initialViewerRef.current.id &&
      viewerRole === initialViewerRef.current.role;

    if (useInitialPage) {
      setComments(initialComments);
      setNextCursor(initialNextCursor);
      setTotalCount(initialTotalCount);
      setLoading(false);

      return cleanup;
    }

    setComments([]);
    setNextCursor(null);
    setTotalCount(0);
    setLoading(true);

    async function loadComments() {
      try {
        const result = await getHomeComments({
          assetSymbol,
          sort,
        });

        if (!isCurrentRequest()) return;

        setComments(result.comments);
        setNextCursor(result.nextCursor);
        setTotalCount(result.totalCount);
      } catch (error) {
        if (!isCurrentRequest()) return;

        setLoadError(true);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load discussions.",
        );
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    }

    void loadComments();

    return cleanup;
  }, [
    assetSymbol,
    sort,
    viewerId,
    viewerRole,
    reloadKey,
    initialComments,
    initialNextCursor,
    initialTotalCount,
  ]);

  const updateComment = useCallback(
    (commentId: string, updater: (comment: Comment) => Comment) => {
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? updater(comment) : comment,
        ),
      );
    },
    [],
  );

  const removeComment = useCallback((commentId: string) => {
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );

    setTotalCount((current) => Math.max(0, current - 1));
  }, []);

  function changeMarket(symbol: string | null) {
    if (symbol === assetSymbol) return;

    requestVersionRef.current += 1;
    setAssetSymbol(symbol);
  }

  function changeSort(nextSort: HomeCommentSort) {
    if (nextSort === sort) return;

    requestVersionRef.current += 1;
    setSort(nextSort);
  }

  async function loadMoreComments() {
    if (!nextCursor || loading || loadingMoreRef.current) return;

    const requestVersion = requestVersionRef.current;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const result = await getHomeComments({
        assetSymbol,
        sort,
        cursor: nextCursor,
      });

      if (requestVersionRef.current !== requestVersion) return;

      setComments((current) => {
        const existingIds = new Set(current.map((comment) => comment.id));

        return [
          ...current,
          ...result.comments.filter((comment) => !existingIds.has(comment.id)),
        ];
      });

      setNextCursor(result.nextCursor);
      setTotalCount(result.totalCount);
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) return;

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load more discussions.",
      );
    } finally {
      if (requestVersionRef.current === requestVersion) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }

  const selectedMarket = assetSymbol ? marketBySymbol.get(assetSymbol) : null;

  return (
    <div className="outfit w-full min-w-0">
      <div className="flex items-baseline gap-2"></div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter discussions by market"
          className="flex min-w-0 flex-wrap items-center gap-2"
        >
          {[
            {
              symbol: null,
              displaySymbol: "All markets",
              name: "All markets",
            },
            ...filterMarkets,
          ].map((market) => {
            const active = assetSymbol === market.symbol;

            return (
              <button
                key={market.symbol ?? "all"}
                type="button"
                title={market.name}
                aria-pressed={active}
                onClick={() => changeMarket(market.symbol)}
                className={`
                  shrink-0 cursor-pointer rounded-full
                  border px-3.5 py-1.5 text-sm
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-zinc-400
                  ${
                    active
                      ? "border-transparent bg-zinc-500/50 text-white font-medium  dark:bg-[#515151] dark:text-zinc-900"
                      : "border-zinc-300 text-zinc-500 hover:border-zinc-400 font-medium  dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                  }
                `}
              >
                {market.displaySymbol}
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto shrink-0">
          <select
            aria-label="Sort discussions"
            value={sort}
            onChange={(event) =>
              changeSort(event.target.value as HomeCommentSort)
            }
            className="
              cursor-pointer appearance-none rounded-full
              border border-zinc-300 bg-white
              py-1.5 pr-9 pl-3.5 text-sm text-zinc-600
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-zinc-400
              dark:border-zinc-700 dark:bg-zinc-900
              dark:text-zinc-300
            "
          >
            <option value="latest">Latest</option>
            <option value="most-liked">Most liked</option>
          </select>

          <ChevronDown
            aria-hidden="true"
            strokeWidth={1.5}
            className="
              pointer-events-none absolute top-1/2 right-3
              size-3.5 -translate-y-1/2 text-zinc-500
            "
          />
        </div>
      </div>

      <div aria-busy={loading} className="mt-5">
        {loading ? (
          <div role="status" className="space-y-6 py-3">
            <span className="sr-only">Loading discussions...</span>

            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="flex animate-pulse gap-3 motion-reduce:animate-none"
              >
                <div className="size-9 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800" />

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-3 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="py-10 text-center">
            <p className="text-sm text-zinc-500">Could not load discussions.</p>

            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="
                mt-3 cursor-pointer rounded-sm text-sm
                text-zinc-700 underline underline-offset-4
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-zinc-400 dark:text-zinc-300
              "
            >
              Try again
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[15px] text-zinc-600 dark:text-zinc-300">
              No discussions yet.
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              {selectedMarket
                ? `Share your view on ${selectedMarket.name}.`
                : "Share your view and start the conversation."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => {
              const asset =
                comment.assets.find(
                  (asset) => asset.assetSymbol === assetSymbol,
                ) ?? comment.assets[0];

              const marketSymbol = asset?.assetSymbol;
              const marketname = marketSymbol
                ? (marketBySymbol.get(marketSymbol)?.name ?? marketSymbol)
                : undefined;

              return (
                <div key={comment.id} className="min-w-0">
                  <CommentItem
                    marketname={marketname}
                    marketSymbol={marketSymbol}
                    comment={comment}
                    currentUser={user}
                    onUpdate={(commentId, updater) =>
                      updateComment(commentId, (current) => ({
                        ...current,
                        ...updater(current),
                        assets: current.assets,
                      }))
                    }
                    onRemove={removeComment}
                    targetCommentId={targetCommentId}
                    targetReplyId={targetReplyId}
                    shouldOpenReplies={
                      Boolean(targetReplyId) && targetCommentId === comment.id
                    }
                    highlightTargetComment={highlightTargetComment}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !loadError && nextCursor && (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={() => void loadMoreComments()}
            disabled={loadingMore}
            className="
              inline-flex cursor-pointer items-center gap-2
              rounded-full px-4 py-2 text-sm text-zinc-500
              transition-colors hover:bg-zinc-100 hover:text-zinc-900
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-zinc-400
              disabled:cursor-wait disabled:opacity-50
              dark:text-zinc-400 dark:hover:bg-zinc-800
              dark:hover:text-zinc-100
            "
          >
            {loadingMore ? "Loading..." : "View more discussions"}

            <ChevronDown
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </div>
  );
}
