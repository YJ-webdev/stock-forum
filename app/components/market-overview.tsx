// app/components/market-overview.tsx

"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_PICKER_LABELS } from "@/lib/data/translations";

import {
  MARKET_SYMBOLS,
  CRYPTO_SYMBOLS,
  CURRENCY_SYMBOLS,
  COMMODITY_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";
import {
  RelativeStocks,
  type MarketPredictionRequest,
} from "./relative-stocks";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { usePointBalance } from "@/app/context/point-balance-context";
import {
  getMarketVote,
  submitMarketVote,
  updateMarketVote,
} from "@/app/actions/market-vote";
import { createComment, getPredictionCommentForEdit } from "@/app/actions/post";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { buildCommentContent } from "@/lib/utils/build-comment-content";
import {
  MARKET_PREDICTION_LABELS,
  VOTE_INTERFACE_LABELS,
  VOTE_TOAST_LABELS,
  VOTE_LABELS,
  PREDICTION_COMMENT_EDIT_LABELS,
  SUBMIT_VALIDATION_LABELS,
} from "@/lib/data/translations";
import type { GifResult } from "./gif-picker";

const MARKET_CATEGORIES: Record<string, MarketSymbolItem[]> = {
  ...MARKET_SYMBOLS,
  Crypto: CRYPTO_SYMBOLS,
  Currency: CURRENCY_SYMBOLS,
  Commodity: COMMODITY_SYMBOLS,
};

const CATEGORY_NAMES = Object.keys(MARKET_CATEGORIES);
const CATEGORY_HOVER_DELAY_MS = 1_000;

function revealCategory(container: HTMLElement, button: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const padding = 12;

  if (buttonRect.left < containerRect.left + padding) {
    container.scrollLeft -= containerRect.left + padding - buttonRect.left;
  } else if (buttonRect.right > containerRect.right - padding) {
    container.scrollLeft += buttonRect.right - containerRect.right + padding;
  }
}

interface MarketOverviewProps {
  query?: string;
  selectedIndex?: number;
  onSearchResultsChange?: (symbols: string[]) => void;
  onNavigate?: () => void;
}

export default function MarketOverview({
  query = "",
  selectedIndex = -1,
  onSearchResultsChange,
  onNavigate,
}: MarketOverviewProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const categoryLabels = MARKET_PICKER_LABELS[language].groups;

  const [predictionRequest, setPredictionRequest] =
    useState<MarketPredictionRequest | null>(null);
  const predictionTriggerRef = useRef<HTMLElement | null>(null);
  const predictionSequenceRef = useRef(0);
  const [predictionSequence, setPredictionSequence] = useState(0);

  function openPrediction(request: MarketPredictionRequest) {
    predictionTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    predictionSequenceRef.current += 1;
    setPredictionSequence(predictionSequenceRef.current);
    setPredictionRequest(request);
  }

  const closePrediction = useCallback(() => {
    setPredictionRequest(null);
    window.requestAnimationFrame(() => {
      const trigger = predictionTriggerRef.current;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLInputElement>("#market-search-input")
          ?.focus({ preventScroll: true });
    });
  }, []);

  const [activeTab, setActiveTab] = useState("America");
  const [isBrowsingCategory, setIsBrowsingCategory] = useState(false);

  const overviewRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const categoryHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    const results: {
      item: MarketSymbolItem;
      category: string;
    }[] = [];

    const seen = new Set<string>();

    for (const [category, items] of Object.entries(MARKET_CATEGORIES)) {
      for (const item of items) {
        if (seen.has(item.symbol)) {
          continue;
        }

        const matches = [item.symbol, item.displaySymbol ?? "", item.name].some(
          (value) => value.toLowerCase().includes(normalizedQuery),
        );

        if (!matches) {
          continue;
        }

        seen.add(item.symbol);
        results.push({ item, category });
      }
    }

    return results;
  }, [normalizedQuery]);

  const matchedCategory = searchResults[0]?.category ?? null;
  const isSearching = hasQuery && !isBrowsingCategory;

  useEffect(() => {
    setIsBrowsingCategory(false);
  }, [normalizedQuery]);

  useEffect(() => {
    if (isSearching && matchedCategory) {
      setActiveTab(matchedCategory);
    }
  }, [isSearching, matchedCategory]);

  useEffect(() => {
    onSearchResultsChange?.(
      isSearching ? searchResults.map((result) => result.item.symbol) : [],
    );
  }, [isSearching, searchResults, onSearchResultsChange]);

  // Reveal the active category without moving the page vertically.
  useEffect(() => {
    const container = categoriesRef.current;
    const activeButton = container?.querySelector<HTMLButtonElement>(
      '[data-active-category="true"]',
    );

    if (!container || !activeButton) {
      return;
    }

    revealCategory(container, activeButton);
  }, [activeTab, language]);

  useEffect(() => {
    return () => {
      if (categoryHoverTimerRef.current !== null) {
        clearTimeout(categoryHoverTimerRef.current);
      }
    };
  }, []);

  function clearCategoryHoverTimer() {
    if (categoryHoverTimerRef.current !== null) {
      clearTimeout(categoryHoverTimerRef.current);
      categoryHoverTimerRef.current = null;
    }
  }

  function handleCategorySelect(category: string) {
    clearCategoryHoverTimer();
    setActiveTab(category);
    setIsBrowsingCategory(true);
  }

  function handleCategoryMouseEnter(category: string) {
    // Touch devices select categories by tapping.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    clearCategoryHoverTimer();

    if (!hasQuery) {
      setActiveTab(category);
      return;
    }

    categoryHoverTimerRef.current = setTimeout(() => {
      setActiveTab(category);
      setIsBrowsingCategory(true);
      categoryHoverTimerRef.current = null;
    }, CATEGORY_HOVER_DELAY_MS);
  }

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();

      document
        .querySelector<HTMLInputElement>("#market-search-input")
        ?.focus({ preventScroll: true });

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      overviewRef.current
        ?.querySelector<HTMLTableRowElement>('[data-market-row="true"]')
        ?.focus({ preventScroll: true });

      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();

    const buttons = Array.from(
      categoriesRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-market-category="true"]',
      ) ?? [],
    );

    const currentIndex = buttons.indexOf(event.currentTarget);

    if (currentIndex === -1 || buttons.length === 0) {
      return;
    }

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + buttons.length) % buttons.length;

    const nextButton = buttons[nextIndex];

    nextButton?.focus({ preventScroll: true });

    const container = categoriesRef.current;

    if (container && nextButton) {
      revealCategory(container, nextButton);
    }
  }

  const displayedItems = isSearching
    ? searchResults.map((result) => result.item)
    : (MARKET_CATEGORIES[activeTab] ?? []);

  return (
    <div
      ref={overviewRef}
      className="
        mx-auto w-full min-w-0 max-w-6xl
        bg-white dark:bg-zinc-800
      "
    >
      <div className="mx-0 flex min-w-0 flex-col gap-3 md:mx-4">
        <div
          className="
            sticky top-0 z-50
            bg-white dark:bg-zinc-800
          "
        >
          <div
            ref={categoriesRef}
            role="group"
            aria-label="Market categories"
            className="
              flex min-w-0 touch-pan-x items-center
              overflow-x-auto overscroll-x-contain
              scrollbar-none [&::-webkit-scrollbar]:hidden
              flex-nowrap gap-2 px-0
            "
          >
            {CATEGORY_NAMES.map((category) => {
              const isActive = activeTab === category;
              const categoryName =
                categoryLabels[category.toLowerCase()] ??
                category.replace(/_/g, " ");

              return (
                <button
                  key={category}
                  type="button"
                  data-market-category="true"
                  data-active-category={isActive ? "true" : "false"}
                  aria-pressed={isActive}
                  onMouseEnter={() => handleCategoryMouseEnter(category)}
                  onMouseLeave={clearCategoryHoverTimer}
                  onClick={() => handleCategorySelect(category)}
                  onKeyDown={handleCategoryKeyDown}
                  className={`
                    flex shrink-0 cursor-pointer
                    items-center justify-center
                    whitespace-nowrap rounded-full
                    text-sm font-medium uppercase
                    transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-inset
                    focus-visible:ring-zinc-400
                    min-h-10 px-4
                    ${
                      isActive
                        ? `
                          text-zinc-950
                          bg-transparent
                          dark:text-zinc-100
                          dark:bg-transparent
                        `
                        : `
                          text-zinc-500 hover:text-zinc-900
                          dark:text-zinc-400 dark:hover:text-zinc-100
                        `
                    }
                  `}
                >
                  {categoryName}
                </button>
              );
            })}
          </div>
        </div>

        {isSearching && displayedItems.length === 0 ? (
          <div
            role="status"
            className="
              flex min-h-40 flex-col items-center justify-center
              gap-1 px-5 text-center
            "
          >
            <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
              No markets found
            </p>

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Try another market name or symbol.
            </p>
          </div>
        ) : (
          <div className="min-w-0 pb-0">
            <RelativeStocks
              items={displayedItems}
              onPredictionRequest={openPrediction}
              selectedIndex={isSearching ? selectedIndex : -1}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
      {predictionRequest && (
        <OverviewPredictionPopup
          key={predictionSequence}
          request={predictionRequest}
          onClose={closePrediction}
        />
      )}
    </div>
  );
}

function EditorLoading() {
  return (
    <div role="status" className="flex min-h-40 items-center justify-center">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 motion-reduce:animate-none dark:border-zinc-700 dark:border-t-zinc-200"
      />
    </div>
  );
}

const PredictionCommentInput = dynamic(
  () =>
    import("./prediction-comment-input").then(
      (mod) => mod.PredictionCommentInput,
    ),
  { ssr: false, loading: EditorLoading },
);
const PredictionCommentEditInput = dynamic(
  () =>
    import("./prediction-comment-edit-input").then(
      (mod) => mod.PredictionCommentEditInput,
    ),
  { ssr: false, loading: EditorLoading },
);

type VoteDirection = "BULL" | "BEAR";
type CurrentVote = Awaited<ReturnType<typeof getMarketVote>>;
type EditableComment = Awaited<ReturnType<typeof getPredictionCommentForEdit>>;

function OverviewPredictionPopup({
  request,
  onClose,
}: {
  request: MarketPredictionRequest;
  onClose: () => void;
}) {
  const user = useCurrentUser();
  const viewerId = user?.id ?? null;
  const initialViewerRef = useRef(viewerId);
  const language = resolveLanguage(user?.language);
  const labels = MARKET_PREDICTION_LABELS[language];
  const interfaceLabels = VOTE_INTERFACE_LABELS[language];
  const toastLabels = VOTE_TOAST_LABELS[language];
  const voteLabels = VOTE_LABELS[language];
  const editLabels = PREDICTION_COMMENT_EDIT_LABELS[language];
  const validationLabels = SUBMIT_VALIDATION_LABELS[language];
  const { points, setPoints } = usePointBalance();
  const { item, sessionDate, mode } = request;
  const editing = mode === "change";
  const combinedEditing = editing && Boolean(viewerId);

  const defaultBetRef = useRef(viewerId && points >= 50 ? 50 : 0);
  const [direction, setDirection] = useState<VoteDirection | null>(() =>
    editing ? (request.initialVote?.direction ?? null) : null,
  );
  const [betAmount, setBetAmount] = useState(() => defaultBetRef.current);
  const [vote, setVote] = useState<CurrentVote>(null);
  const [editableComment, setEditableComment] =
    useState<EditableComment | null>(null);
  const [loading, setLoading] = useState(combinedEditing);
  const [loadError, setLoadError] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const mountedRef = useRef(false);
  const savingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sessionMs = sessionDate.getTime();
  const windowState = getVotingWindow(item.symbol, now);
  const sameSession = windowState.predictionFor?.getTime() === sessionMs;
  const canVote =
    windowState.canVote && !windowState.isMarketOpen && sameSession;
  const availablePoints = viewerId
    ? Math.max(0, points + (editing ? (vote?.pointsBet ?? 0) : 0))
    : 0;
  const maxBet = Math.floor(Math.min(500, availablePoints) / 50) * 50;
  const guestVoteAvailable = !viewerId && !!request.initialVote;
  const inputDisabled =
    loading ||
    loadError ||
    !canVote ||
    (editing
      ? viewerId
        ? vote?.status !== "PENDING"
        : !guestVoteAvailable
      : !!vote);

  const close = useCallback(() => {
    if (!savingRef.current) onClose();
  }, [onClose]);

  function finish() {
    request.onSuccess();
    onClose();
  }

  useEffect(() => {
    mountedRef.current = true;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // An editor opened by another viewer must never be reused.
  useEffect(() => {
    if (viewerId !== initialViewerRef.current) onClose();
  }, [viewerId, onClose]);

  useEffect(() => {
    function update() {
      if (document.visibilityState === "visible") setNow(Date.now());
    }
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Creation already starts from a checked, unvoted list row.
  // Guest edits use the checked vote snapshot supplied by the list.
  // Member edits load the linked prediction/comment.
  // The server still validates duplicates, ownership, and deadlines on submit.
  useEffect(() => {
    if (!combinedEditing) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setEditableComment(null);

    async function load() {
      try {
        const currentVote = await getMarketVote({
          symbol: item.symbol,
          sessionDate: new Date(sessionMs),
        });
        if (cancelled) return;
        setVote(currentVote);
        setDirection(editing ? (currentVote?.direction ?? null) : null);
        setBetAmount(
          editing ? (currentVote?.pointsBet ?? 0) : defaultBetRef.current,
        );

        if (combinedEditing && currentVote) {
          const comment = await getPredictionCommentForEdit({
            symbol: item.symbol,
            sessionDate: new Date(sessionMs),
          });
          if (cancelled) return;
          setEditableComment(comment);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load overview prediction editor:", error);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    item.symbol,
    sessionMs,
    editing,
    combinedEditing,
    viewerId,
    retryVersion,
  ]);

  // Use the same portal layout as the existing market vote popup.
  // Trap keyboard focus while permitting GIF picker portals to handle Escape first.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (
        !panel ||
        !(event.target instanceof Node) ||
        !panel.contains(event.target)
      )
        return;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        panel.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel)
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  async function submitVote(comment: string, gif: GifResult | null) {
    if (savingRef.current || loading || loadError || (editing && viewerId))
      return;
    const liveWindow = getVotingWindow(item.symbol, Date.now());
    if (
      !liveWindow.canVote ||
      liveWindow.isMarketOpen ||
      liveWindow.predictionFor?.getTime() !== sessionMs
    ) {
      setNow(Date.now());
      toast.error(toastLabels.unavailable);
      return;
    }
    if (inputDisabled) {
      toast.error(toastLabels.unavailable);
      return;
    }
    if (!direction) {
      toast.error(validationLabels.direction);
      return;
    }
    const submittedAmount = viewerId ? betAmount : 0;
    if (
      !Number.isInteger(submittedAmount) ||
      submittedAmount < 0 ||
      submittedAmount > maxBet ||
      submittedAmount % 50 !== 0
    ) {
      toast.error(validationLabels.points);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      if (editing) {
        const result = await updateMarketVote({
          symbol: item.symbol,
          direction,
          pointsBet: 0,
          sessionDate: new Date(sessionMs),
        });
        if (result.points !== null) setPoints(result.points);
      } else if (viewerId) {
        const canWrite = user?.status !== "BANNED" && user?.status !== "MUTED";
        const result = await createComment({
          content: buildCommentContent(
            canWrite ? comment : "",
            canWrite ? gif : null,
          ),
          assetSymbols: [item.symbol],
          prediction: {
            direction,
            pointsBet: submittedAmount,
            sessionDate: new Date(sessionMs),
          },
        });
        if (result.points !== null) setPoints(result.points);
      } else {
        await submitMarketVote({
          symbol: item.symbol,
          direction,
          pointsBet: 0,
          sessionDate: new Date(sessionMs),
        });
      }
      if (!mountedRef.current) return;
      if (editing) toast.success(editLabels.saved_combined);
      else
        toast.success(
          (submittedAmount > 0
            ? toastLabels.success_with_points
            : toastLabels.success
          )
            .replace(
              "{voteDirection}",
              direction === "BULL" ? voteLabels.bull : voteLabels.bear,
            )
            .replace("{points}", submittedAmount.toLocaleString(language)),
        );
      finish();
    } catch (error) {
      if (mountedRef.current)
        toast.error(
          error instanceof Error ? error.message : toastLabels.failed,
        );
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }

  const editorUnavailable = editing
    ? viewerId
      ? !vote
      : !guestVoteAvailable
    : Boolean(vote);
  const titleId = `overview-prediction-${item.symbol.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return createPortal(
    <div
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 z-100 flex items-end justify-center bg-black/30 lg:items-center lg:p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none dark:border-zinc-700 dark:bg-zinc-900 lg:max-w-lg lg:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id={titleId}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            {editing ? labels.change : labels.prediction} · {item.name}
          </h2>
          <button
            type="button"
            disabled={saving}
            aria-label={interfaceLabels.close}
            onClick={close}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-default disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {loading ? (
          <EditorLoading />
        ) : loadError ||
          editorUnavailable ||
          (combinedEditing && !editableComment) ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3">
            <p
              role="alert"
              className="text-sm text-zinc-500 dark:text-zinc-400"
            >
              {loadError
                ? interfaceLabels.lookup_failed
                : !editing && vote
                  ? toastLabels.already_voted
                  : toastLabels.unavailable}
            </p>
            <button
              type="button"
              onClick={() => setRetryVersion((value) => value + 1)}
              className="cursor-pointer text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              {interfaceLabels.retry}
            </button>
          </div>
        ) : combinedEditing && editableComment ? (
          <PredictionCommentEditInput
            key={`${editableComment.id}:${editableComment.prediction.id}`}
            refreshOnSaved={false}
            commentId={editableComment.id}
            initialContent={editableComment.content}
            prediction={editableComment.prediction}
            onCancel={close}
            onSavingChange={(value) => {
              savingRef.current = value;
              if (mountedRef.current) setSaving(value);
            }}
            onSaved={() => {
              if (mountedRef.current) finish();
            }}
          />
        ) : (
          <PredictionCommentInput
            key={`${retryVersion}:${mode}`}
            variant="popup"
            mode={editing ? "edit" : "create"}
            onCancel={close}
            assetSymbol={item.symbol}
            onCommentCreated={() => {
              if (mountedRef.current) finish();
            }}
            direction={direction}
            setDirection={setDirection}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            userPoints={availablePoints}
            maxBet={maxBet}
            currentUser={user ?? null}
            isMarketOpen={windowState.isMarketOpen}
            buttonDisabled={inputDisabled}
            isPending={saving}
            isSubmitting={saving}
            submitVote={(comment, gif) => {
              void submitVote(comment, gif);
            }}
            targetMs={windowState.targetMs}
            countdownType={windowState.countdownType}
            showCountdown={windowState.showCountdown}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
