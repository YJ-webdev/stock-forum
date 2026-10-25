"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { NATIONALITIES } from "@/lib/data/nationalities";

import {
  generateBotComment,
  getBotMarketState,
  getBotUsers,
} from "@/app/actions/user-bot";
import { createComment } from "@/app/actions/post";

import { CommentItem } from "@/app/components/comment-item";
import { CommentOnlyInput } from "@/app/components/comment-only-input";
import { PredictionCommentInput } from "@/app/components/prediction-comment-input";
import type { GifResult } from "@/app/components/gif-picker";

import { CreateBotUser } from "./create-bot-user";
import { EditBotUser } from "./edit-bot-user";

type BotProfile = Awaited<ReturnType<typeof getBotUsers>>[number];
type BotMarketState = Awaited<ReturnType<typeof getBotMarketState>>;

type CommentItemProps = ComponentProps<typeof CommentItem>;
type MarketComment = CommentItemProps["comment"];

type Mode = "comment" | "prediction";
type Direction = "BULL" | "BEAR";

interface UserBotProps {
  bots: BotProfile[];
  currentUser: CommentItemProps["currentUser"];
}

interface SubmittedComment {
  comment: MarketComment;
  symbol: string;
  marketName: string;
}

interface CommentSubmitInput {
  content: JSONContent;
  assetSymbols: string[];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function getNationalityLabel(value: string | null) {
  if (!value) return "No nationality";

  return (
    NATIONALITIES.find((country) => country.value === value)?.label ?? value
  );
}

function buildCommentContent(text: string, gif: GifResult | null): JSONContent {
  const trimmed = text.trim();
  const nodes: JSONContent[] = [];

  if (trimmed) {
    for (const line of trimmed.split(/\r\n|\r|\n/)) {
      nodes.push({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      });
    }
  }

  if (gif) {
    nodes.push({
      type: "image",
      attrs: {
        src: gif.src,
        alt: gif.title,
      },
    });
  }

  return {
    type: "doc",
    content: nodes,
  };
}

export function UserBot({ bots: initialBots, currentUser }: UserBotProps) {
  const [bots, setBots] = useState<BotProfile[]>(initialBots);
  const [botId, setBotId] = useState(initialBots[0]?.id ?? "");
  const [symbol, setSymbol] = useState(ALL_MARKET_SYMBOLS[0]?.symbol ?? "");

  const [mode, setMode] = useState<Mode>("comment");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [betAmount, setBetAmount] = useState(50);

  const [marketState, setMarketState] = useState<BotMarketState | null>(null);
  const [loadedStateKey, setLoadedStateKey] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [refreshRevision, setRefreshRevision] = useState(0);

  const [generatedComment, setGeneratedComment] = useState("");
  const [draftRevision, setDraftRevision] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingBot, setIsEditingBot] = useState(false);

  const [submittedComments, setSubmittedComments] = useState<
    SubmittedComment[]
  >([]);

  const requestInFlight = useRef(false);

  const selectedBot = bots.find((bot) => bot.id === botId);
  const selectedMarket = ALL_MARKET_SYMBOLS.find(
    (market) => market.symbol === symbol,
  );

  const selectionKey = JSON.stringify([botId, symbol]);
  const composerKey = JSON.stringify([botId, symbol, mode, draftRevision]);

  const isBusy = isGenerating || isSubmitting || isEditingBot;

  const stateReady =
    loadedStateKey === selectionKey &&
    marketState !== null &&
    !loadingState &&
    !stateError;

  const canPredict = Boolean(
    stateReady &&
    selectedMarket?.assetType === "index" &&
    selectedBot?.nationality &&
    marketState?.canVote &&
    marketState.sessionDate &&
    !marketState.hasVoted,
  );

  const maxBet = stateReady
    ? Math.floor(Math.max(0, Math.min(500, marketState?.points ?? 0)) / 50) * 50
    : 0;

  // Merge refreshed server profiles while preserving newly created bots.
  useEffect(() => {
    setBots((previous) => {
      const serverIds = new Set(initialBots.map((bot) => bot.id));

      return [
        ...initialBots,
        ...previous.filter((bot) => !serverIds.has(bot.id)),
      ];
    });
  }, [initialBots]);

  useEffect(() => {
    if (!botId || !symbol) return;

    let cancelled = false;

    setLoadingState(true);
    setStateError(null);
    setMarketState(null);
    setLoadedStateKey("");

    async function loadState() {
      try {
        const result = await getBotMarketState(botId, symbol);

        if (cancelled) return;

        setMarketState(result);
        setLoadedStateKey(selectionKey);
      } catch (error) {
        if (!cancelled) {
          setStateError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingState(false);
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [botId, symbol, selectionKey, refreshRevision]);

  function resetDraft() {
    setGeneratedComment("");
    setDraftRevision((revision) => revision + 1);
  }

  function changeMarket(value: string | null) {
    if (!value || requestInFlight.current || isBusy) return;

    setSymbol(value);
    setDirection(null);
    resetDraft();

    const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === value);

    if (market?.assetType !== "index") {
      setMode("comment");
    }
  }

  function changeBot(value: string | null) {
    if (!value || requestInFlight.current || isBusy) return;

    setBotId(value);
    setDirection(null);
    setBetAmount(50);
    resetDraft();
  }

  function changeMode(nextMode: Mode) {
    if (requestInFlight.current || isBusy || nextMode === mode) {
      return;
    }

    setMode(nextMode);
    setDirection(null);
    resetDraft();
  }

  function handleBotCreated(bot: BotProfile) {
    setBots((previous) => [
      bot,
      ...previous.filter((item) => item.id !== bot.id),
    ]);

    setBotId(bot.id);
    setDirection(null);
    setBetAmount(50);
    resetDraft();
  }

  function addSubmittedComment(
    comment: MarketComment,
    marketSymbol: string,
    marketName: string,
  ) {
    setSubmittedComments((items) => [
      {
        comment,
        symbol: marketSymbol,
        marketName,
      },
      ...items.filter((item) => item.comment.id !== comment.id),
    ]);
  }

  // Shared by both inputs after a comment-only submission.
  function handleCommentCreated(comment: MarketComment) {
    if (!selectedMarket) return;

    addSubmittedComment(comment, selectedMarket.symbol, selectedMarket.name);

    resetDraft();
  }

  async function handleGenerate() {
    if (!selectedBot || !selectedMarket || requestInFlight.current || isBusy) {
      return;
    }

    // No direction means generate a general market comment.
    const generationDirection = mode === "prediction" ? direction : null;

    if (generationDirection && !canPredict) {
      toast.error("Voting is unavailable for this bot and market.");
      return;
    }

    requestInFlight.current = true;
    setIsGenerating(true);

    try {
      const result = await generateBotComment({
        botUserId: selectedBot.id,
        symbol: selectedMarket.symbol,
        direction: generationDirection,
      });

      setGeneratedComment(result.text);
      setDraftRevision((revision) => revision + 1);

      toast.success("Comment generated. Review it before posting.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      requestInFlight.current = false;
      setIsGenerating(false);
    }
  }

  // Injected into both inputs so comments use the selected bot.
  async function handleCommentSubmit(input: CommentSubmitInput) {
    if (!selectedBot || !selectedMarket) {
      throw new Error("Choose a bot and market.");
    }

    if (requestInFlight.current || isEditingBot) {
      throw new Error("Please wait for the current request.");
    }

    if (
      input.assetSymbols.length !== 1 ||
      input.assetSymbols[0] !== selectedMarket.symbol
    ) {
      throw new Error("The selected market changed. Please try again.");
    }

    requestInFlight.current = true;
    setIsSubmitting(true);

    try {
      return await createComment({
        botUserId: selectedBot.id,
        assetSymbols: [selectedMarket.symbol],
        content: input.content,
        prediction: null,
      });
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  // Prediction submission allows an optional comment and GIF.
  async function handlePredictionSubmit(
    comment: string,
    gif: GifResult | null,
  ) {
    if (
      !selectedBot ||
      !selectedMarket ||
      requestInFlight.current ||
      isEditingBot
    ) {
      return;
    }

    if (!direction) {
      toast.error("Choose Bull or Bear.");
      return;
    }

    const submittedDirection = direction;
    const submittedAmount = betAmount;
    const submittedBot = selectedBot;
    const submittedMarket = selectedMarket;
    const submittedSelectionKey = selectionKey;

    requestInFlight.current = true;
    setIsSubmitting(true);

    try {
      const freshState = await getBotMarketState(
        submittedBot.id,
        submittedMarket.symbol,
      );

      setMarketState(freshState);
      setLoadedStateKey(submittedSelectionKey);

      if (!submittedBot.nationality) {
        throw new Error("Set this bot's nationality before voting.");
      }

      if (submittedMarket.assetType !== "index") {
        throw new Error("Predictions are available for indices only.");
      }

      if (freshState.hasVoted) {
        throw new Error("This bot already voted for this session.");
      }

      if (!freshState.canVote || !freshState.sessionDate) {
        throw new Error("Voting is closed.");
      }

      if (
        !Number.isInteger(submittedAmount) ||
        submittedAmount < 0 ||
        submittedAmount > 500 ||
        submittedAmount % 50 !== 0
      ) {
        throw new Error("Use 0–500 points in steps of 50.");
      }

      if (submittedAmount > freshState.points) {
        throw new Error("This bot has insufficient points.");
      }

      const hasContent = Boolean(comment.trim() || gif);

      const result = await createComment({
        botUserId: submittedBot.id,
        assetSymbols: [submittedMarket.symbol],
        content: hasContent ? buildCommentContent(comment, gif) : null,
        prediction: {
          direction: submittedDirection,
          pointsBet: submittedAmount,
          sessionDate: new Date(freshState.sessionDate),
        },
      });

      if (result.comment) {
        addSubmittedComment(
          result.comment,
          submittedMarket.symbol,
          submittedMarket.name,
        );
      }

      setMarketState({
        ...freshState,
        hasVoted: true,
        points: result.points ?? freshState.points,
      });

      setDirection(null);
      resetDraft();

      toast.success(
        hasContent
          ? "Bot prediction and comment submitted."
          : "Bot prediction submitted.",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  function getPredictionStatus() {
    if (loadingState) {
      return "Loading voting status...";
    }

    if (!stateReady) {
      return "Refresh status to check voting availability.";
    }

    if (!selectedBot?.nationality) {
      return "Set this bot's nationality before voting. Comments are still available.";
    }

    if (marketState?.hasVoted) {
      return "Vote completed for this session. You can still post a comment.";
    }

    if (!marketState?.canVote || !marketState.sessionDate) {
      return "Voting is closed. You can still post a comment.";
    }

    return "Choose Bull or Bear to vote, or select Comment only. Text and GIFs are optional when voting.";
  }

  return (
    <section className="space-y-6 py-6">
      <div>
        <h2 className="text-xl font-semibold">Bot users</h2>

        <p className="mt-1 text-[15px] text-zinc-500">
          Create bot profiles and publish market comments.
        </p>
      </div>

      <CreateBotUser disabled={isBusy} onCreated={handleBotCreated} />

      {bots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-100 p-6 dark:border-zinc-700">
          <p className="text-[15px] text-zinc-500">
            No bot profiles yet. Create a bot to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Market</p>

              <Select
                value={symbol}
                disabled={isBusy}
                onValueChange={changeMarket}
              >
                <SelectTrigger aria-label="Select market" className="w-full">
                  <SelectValue>
                    {selectedMarket?.name ?? "Select market"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent align="start">
                  {ALL_MARKET_SYMBOLS.map((market) => (
                    <SelectItem
                      key={market.symbol}
                      value={market.symbol}
                      className="cursor-pointer"
                    >
                      {market.name} · {market.displaySymbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Bot profile</p>

              <Select
                value={botId || null}
                disabled={isBusy}
                onValueChange={changeBot}
              >
                <SelectTrigger
                  aria-label="Select bot profile"
                  className="w-full"
                >
                  <SelectValue>{selectedBot?.name ?? "Select bot"}</SelectValue>
                </SelectTrigger>

                <SelectContent align="start">
                  {bots.map((bot) => (
                    <SelectItem
                      key={bot.id}
                      value={bot.id}
                      className="cursor-pointer"
                    >
                      {bot.name ?? "Bot"} ·{" "}
                      {getNationalityLabel(bot.nationality)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedBot && (
            <div className="flex items-center gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarImage
                  src={selectedBot.image ?? undefined}
                  alt={selectedBot.name ?? "Bot"}
                  className="object-cover"
                />

                <AvatarFallback>
                  {(selectedBot.name ?? "Bot").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {selectedBot.name ?? "Bot"}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800">
                    Bot
                  </span>
                </div>

                <p className="text-sm text-zinc-500">
                  {getNationalityLabel(selectedBot.nationality)}
                  {" · "}
                  {stateError
                    ? "Points unavailable"
                    : loadingState || loadedStateKey !== selectionKey
                      ? "Loading..."
                      : marketState
                        ? `${marketState.points.toLocaleString("en-US")} pts`
                        : "Points unavailable"}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "comment" ? "default" : "outline"}
              aria-pressed={mode === "comment"}
              disabled={isBusy}
              onClick={() => changeMode("comment")}
              className="cursor-pointer rounded-full"
            >
              Comment only
            </Button>

            <Button
              type="button"
              size="sm"
              variant={mode === "prediction" ? "default" : "outline"}
              aria-pressed={mode === "prediction"}
              disabled={isBusy || selectedMarket?.assetType !== "index"}
              onClick={() => changeMode("prediction")}
              className="cursor-pointer rounded-full"
            >
              Prediction
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isBusy || loadingState || !selectedBot}
              onClick={() => {
                setRefreshRevision((revision) => revision + 1);
              }}
              className="cursor-pointer"
            >
              Refresh status
            </Button>
          </div>

          {stateError && (
            <p role="alert" className="text-sm text-rose-600">
              {stateError}
            </p>
          )}

          {selectedBot && selectedMarket && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">
                  {mode === "prediction"
                    ? getPredictionStatus()
                    : "Generate a draft or write your own comment."}
                </p>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleGenerate()}
                  disabled={
                    isBusy ||
                    (mode === "prediction" && direction !== null && !canPredict)
                  }
                  className="cursor-pointer"
                >
                  {isGenerating ? "Generating..." : "Generate comment"}
                </Button>
              </div>

              <fieldset disabled={isBusy} className="min-w-0 border-0 p-0">
                {mode === "comment" ? (
                  <CommentOnlyInput
                    key={composerKey}
                    assetSymbol={selectedMarket.symbol}
                    currentUser={selectedBot}
                    initialComment={generatedComment}
                    submitComment={handleCommentSubmit}
                    onCommentCreated={handleCommentCreated}
                    targetMs={
                      stateReady ? (marketState?.targetMs ?? null) : null
                    }
                    countdownType={
                      stateReady ? (marketState?.countdownType ?? null) : null
                    }
                    showCountdown={
                      stateReady ? (marketState?.showCountdown ?? false) : false
                    }
                    isMarketOpen={
                      stateReady ? (marketState?.isMarketOpen ?? false) : false
                    }
                  />
                ) : (
                  <PredictionCommentInput
                    key={composerKey}
                    assetSymbol={selectedMarket.symbol}
                    currentUser={selectedBot}
                    initialComment={generatedComment}
                    submitComment={handleCommentSubmit}
                    onCommentCreated={handleCommentCreated}
                    direction={direction}
                    setDirection={setDirection}
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    userPoints={stateReady ? (marketState?.points ?? 0) : 0}
                    maxBet={maxBet}
                    buttonDisabled={!canPredict}
                    isPending={isBusy}
                    isMarketOpen={
                      stateReady ? (marketState?.isMarketOpen ?? false) : false
                    }
                    targetMs={
                      stateReady ? (marketState?.targetMs ?? null) : null
                    }
                    countdownType={
                      stateReady ? (marketState?.countdownType ?? null) : null
                    }
                    showCountdown={
                      stateReady ? (marketState?.showCountdown ?? false) : false
                    }
                    submitVote={(comment, gif) => {
                      void handlePredictionSubmit(comment, gif);
                    }}
                  />
                )}
              </fieldset>
            </div>
          )}
        </>
      )}

      {submittedComments.length > 0 && (
        <div className="space-y-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h3 className="text-sm font-semibold">Submitted comments</h3>

          {submittedComments.map((entry) => (
            <CommentItem
              key={entry.comment.id}
              comment={entry.comment}
              currentUser={currentUser}
              marketname={entry.marketName}
              marketSymbol={entry.symbol}
              targetCommentId={null}
              targetReplyId={null}
              shouldOpenReplies={false}
              highlightTargetComment={false}
              onUpdate={(commentId, updater) => {
                setSubmittedComments((items) =>
                  items.map((item) =>
                    item.comment.id === commentId
                      ? {
                          ...item,
                          comment: updater(item.comment),
                        }
                      : item,
                  ),
                );
              }}
              onRemove={(commentId) => {
                setSubmittedComments((items) =>
                  items.filter((item) => item.comment.id !== commentId),
                );
              }}
            />
          ))}
        </div>
      )}

      {selectedBot && (
        <EditBotUser
          key={selectedBot.id}
          bot={selectedBot}
          disabled={isGenerating || isSubmitting}
          onBusyChange={setIsEditingBot}
          onUpdated={(updatedBot) => {
            setBots((previous) =>
              previous.map((bot) =>
                bot.id === updatedBot.id ? updatedBot : bot,
              ),
            );

            setSubmittedComments((previous) =>
              previous.map((entry) =>
                entry.comment.author.id === updatedBot.id
                  ? {
                      ...entry,
                      comment: {
                        ...entry.comment,
                        author: {
                          ...entry.comment.author,
                          name: updatedBot.name,
                          image: updatedBot.image,
                        },
                      },
                    }
                  : entry,
              ),
            );
          }}
        />
      )}
    </section>
  );
}
