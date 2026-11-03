"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  getHomeComments,
  type HomeComments,
  type HomeCommentCursor,
  type HomeCommentSort,
} from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";
import { HOME_COMMUNITY_LABELS } from "@/lib/data/translations";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CommentItem } from "./comment-item";
import { HomeCommentComposer } from "./home-comment-composer";
import { LoadMoreButton } from "./load-more-button";

interface HomeCommunityProps {
  initialNowMs: number;
  initialComments: HomeComments;
  initialNextCursor: HomeCommentCursor | null;

  markets: {
    symbol: string;
    displaySymbol: string;
    name: string;
    commentCount: number;
  }[];
}

type Comment = HomeComments[number];

interface CommentPage {
  comments: HomeComments;
  nextCursor: HomeCommentCursor | null;
}

const COMMENTS_TIMEOUT_MS = 15_000;
const TIME_REFRESH_INTERVAL_MS = 60_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = COMMENTS_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Comments request timed out."));
    }, timeoutMs);

    promise.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getPageKey(
  symbol: string | null,
  sort: HomeCommentSort,
  viewerId: string | null,
  viewerRole: string | null,
) {
  return JSON.stringify([symbol, sort, viewerId, viewerRole]);
}

export function HomeCommunity({
  initialNowMs,
  initialComments,
  initialNextCursor,
  markets,
}: HomeCommunityProps) {
  const user = useCurrentUser();
  const searchParams = useSearchParams();

  const language = resolveLanguage(user?.language);
  const labels = HOME_COMMUNITY_LABELS[language];
  const labelsRef = useRef(labels);

  const viewerId = user?.id ?? null;
  const viewerRole = user?.role ?? null;

  const [nowMs, setNowMs] = useState(initialNowMs);

  const [assetSymbol, setAssetSymbol] = useState<string | null>(null);
  const [sort, setSort] = useState<HomeCommentSort>("latest");

  const [comments, setComments] = useState(initialComments);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const requestVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const initialViewerRef = useRef({
    id: viewerId,
    role: viewerRole,
  });

  // Keep each fetched market/sort result in memory.
  const pagesRef = useRef<Map<string, CommentPage>>(
    new Map([
      [
        getPageKey(
          null,
          "latest",
          initialViewerRef.current.id,
          initialViewerRef.current.role,
        ),
        {
          comments: initialComments,
          nextCursor: initialNextCursor,
        },
      ],
    ]),
  );

  const pageKey = getPageKey(assetSymbol, sort, viewerId, viewerRole);

  const targetCommentId = searchParams.get("comment");
  const targetReplyId = searchParams.get("reply");
  const from = searchParams.get("from");

  const marketBySymbol = useMemo(
    () => new Map(ALL_MARKET_SYMBOLS.map((market) => [market.symbol, market])),
    [],
  );

  const filterMarkets = markets.slice(0, 5);
  const selectedMarket = assetSymbol ? marketBySymbol.get(assetSymbol) : null;

  const highlightTargetComment =
    Boolean(targetCommentId) && (from === "most-liked" || from === "report");

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());

    updateNow();

    const timer = window.setInterval(updateNow, TIME_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [initialNowMs]);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    let cancelled = false;

    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoadError(false);

    const isCurrentRequest = () =>
      !cancelled && requestVersionRef.current === requestVersion;

    const cached = pagesRef.current.get(pageKey);

    if (cached) {
      setComments(cached.comments);
      setNextCursor(cached.nextCursor);
      setLoading(false);

      return () => {
        cancelled = true;
        requestVersionRef.current += 1;
      };
    }

    setComments([]);
    setNextCursor(null);
    setLoading(true);

    async function loadComments() {
      try {
        const result = await withTimeout(
          getHomeComments({
            assetSymbol,
            sort,
          }),
        );

        if (!isCurrentRequest()) return;

        const page: CommentPage = {
          comments: result.comments,
          nextCursor: result.nextCursor,
        };

        pagesRef.current.set(pageKey, page);

        setComments(page.comments);
        setNextCursor(page.nextCursor);
        setNowMs(Date.now());
      } catch (error) {
        if (!isCurrentRequest()) return;

        console.error(error);
        setLoadError(true);
        toast.error(labelsRef.current.load_failed);
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    }

    void loadComments();

    return () => {
      cancelled = true;
      requestVersionRef.current += 1;
    };
  }, [assetSymbol, sort, viewerId, viewerRole, pageKey, reloadKey]);

  const updateComment = useCallback(
    (commentId: string, updater: (comment: Comment) => Comment) => {
      for (const [key, page] of pagesRef.current) {
        if (!page.comments.some((comment) => comment.id === commentId)) {
          continue;
        }

        pagesRef.current.set(key, {
          ...page,
          comments: page.comments.map((comment) =>
            comment.id === commentId ? updater(comment) : comment,
          ),
        });
      }

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? updater(comment) : comment,
        ),
      );
    },
    [],
  );

  const removeComment = useCallback((commentId: string) => {
    for (const [key, page] of pagesRef.current) {
      pagesRef.current.set(key, {
        ...page,
        comments: page.comments.filter((comment) => comment.id !== commentId),
      });
    }

    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );
  }, []);

  function changeMarket(symbol: string | null) {
    if (symbol === assetSymbol) return;

    requestVersionRef.current += 1;

    const key = getPageKey(symbol, sort, viewerId, viewerRole);
    const page = pagesRef.current.get(key);

    if (page) {
      setComments(page.comments);
      setNextCursor(page.nextCursor);
      setLoading(false);
      setLoadError(false);
    } else {
      setComments([]);
      setNextCursor(null);
      setLoading(true);
    }

    setAssetSymbol(symbol);
  }

  function changeSort(nextSort: HomeCommentSort) {
    if (nextSort === sort) return;

    requestVersionRef.current += 1;

    const key = getPageKey(assetSymbol, nextSort, viewerId, viewerRole);

    const page = pagesRef.current.get(key);

    if (page) {
      setComments(page.comments);
      setNextCursor(page.nextCursor);
      setLoading(false);
      setLoadError(false);
    } else {
      setComments([]);
      setNextCursor(null);
      setLoading(true);
    }

    setSort(nextSort);
  }

  async function loadMoreComments() {
    if (!nextCursor || loading || loadingMoreRef.current) return;

    const requestVersion = requestVersionRef.current;
    const cursor = nextCursor;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const result = await withTimeout(
        getHomeComments({
          assetSymbol,
          sort,
          cursor,
        }),
      );

      if (requestVersionRef.current !== requestVersion) return;

      const existing = pagesRef.current.get(pageKey);

      const currentComments = existing?.comments ?? comments;
      const existingIds = new Set(currentComments.map((comment) => comment.id));

      const mergedComments = [
        ...currentComments,
        ...result.comments.filter((comment) => !existingIds.has(comment.id)),
      ];

      const page: CommentPage = {
        comments: mergedComments,
        nextCursor: result.nextCursor,
      };

      pagesRef.current.set(pageKey, page);

      setComments(page.comments);
      setNextCursor(page.nextCursor);
      setNowMs(Date.now());
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) return;

      console.error(error);
      toast.error(labelsRef.current.load_more_failed);
    } finally {
      if (requestVersionRef.current === requestVersion) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }

  return (
    <div
      className={`w-full min-w-0 ${
        !loading && !loadError && !nextCursor ? "pb-14" : "pb-4"
      }`}
    >
      <div className="mt-2 mb-7 flex flex-wrap items-center gap-2">
        {[
          {
            symbol: null,
            displaySymbol: labels.all_markets,
            name: labels.all_markets,
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
                inline-flex h-8.5 shrink-0 cursor-pointer
                items-center justify-center whitespace-nowrap
                rounded-full border px-3.5 text-sm font-medium
                transition-colors
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-zinc-400
                ${
                  active
                    ? `
                      border-transparent bg-zinc-500/50 text-white
                      dark:bg-[#515151] dark:text-zinc-100
                    `
                    : `
                      border-zinc-300 text-zinc-500
                      hover:border-zinc-400
                      dark:border-zinc-700 dark:text-zinc-500
                      dark:hover:border-zinc-700
                      dark:hover:text-zinc-100
                    `
                }
              `}
            >
              {market.displaySymbol}
            </button>
          );
        })}

        <div className="ml-auto shrink-0">
          <Select
            value={sort}
            onValueChange={(value) => changeSort(value as HomeCommentSort)}
          >
            <SelectTrigger
              aria-label={labels.sort_discussions}
              className="h-9 w-auto whitespace-nowrap rounded-full"
            >
              <SelectValue>
                {sort === "latest" ? labels.latest : labels.most_liked}
              </SelectValue>
            </SelectTrigger>

            <SelectContent
              align="end"
              className="
                rounded-xl border-zinc-200 bg-white
                dark:border-zinc-700 dark:bg-zinc-900
              "
            >
              <SelectItem value="latest" className="cursor-pointer rounded-lg">
                {labels.latest}
              </SelectItem>

              <SelectItem
                value="most-liked"
                className="cursor-pointer rounded-lg"
              >
                {labels.most_liked}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <HomeCommentComposer
        defaultSymbol={assetSymbol}
        onPublished={(postedSymbol) => {
          requestVersionRef.current += 1;

          pagesRef.current.clear();

          if (assetSymbol !== null) {
            setAssetSymbol(postedSymbol);
          }

          setSort("latest");
          setReloadKey((current) => current + 1);
        }}
      />

      <div aria-busy={loading} className="mt-7">
        {loading ? (
          <div role="status" className="space-y-6 py-3">
            <span className="sr-only">{labels.loading_discussions}</span>

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
            <p className="text-sm text-zinc-500">{labels.load_failed}</p>

            <button
              type="button"
              onClick={() => {
                pagesRef.current.delete(pageKey);
                setReloadKey((current) => current + 1);
              }}
              className="
                mt-3 cursor-pointer rounded-sm text-sm
                text-zinc-700 underline underline-offset-4
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-zinc-400
                dark:text-zinc-100
              "
            >
              {labels.retry}
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[15px] text-zinc-600 dark:text-zinc-100">
              {labels.empty}
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              {selectedMarket
                ? labels.share_market.replace("{market}", selectedMarket.name)
                : labels.share_view}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                    initialNowMs={nowMs}
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
        <LoadMoreButton
          loading={loadingMore}
          onClick={() => void loadMoreComments()}
        />
      )}
    </div>
  );
}
