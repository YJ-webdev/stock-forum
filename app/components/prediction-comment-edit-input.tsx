"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { editComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { usePointBalance } from "@/app/context/point-balance-context";

import { resolveLanguage } from "@/lib/data/languages";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { isDeletedPredictionContent } from "@/lib/utils/is-deleted-prediction-content";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_EDIT_LABELS,
  PREDICTION_COMMENT_EDIT_LABELS,
} from "@/lib/data/translations";

import { PredictionCommentInput } from "./prediction-comment-input";
import type { GifResult } from "./gif-picker";

type VoteDirection = "BULL" | "BEAR";
type EditResult = Awaited<ReturnType<typeof editComment>>;

interface PredictionCommentEditInputProps {
  commentId: string;
  initialContent: JSONContent;

  prediction: {
    id: string;
    symbol: string;
    direction: VoteDirection;
    pointsBet: number;
    sessionDate: Date | string;
    status: string;
  };

  onCancel: () => void;
  onSaved: (result: EditResult) => void | Promise<void>;
  onSavingChange?: (saving: boolean) => void;
}

function getNodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  return (node.content ?? []).map(getNodeText).join("");
}

function getInitialContent(content: JSONContent): {
  text: string;
  gif: GifResult | null;
} {
  if (isDeletedPredictionContent(content)) {
    return { text: "", gif: null };
  }

  const paragraphs: string[] = [];
  let gif: GifResult | null = null;

  for (const node of content.content ?? []) {
    if (node.type === "paragraph") {
      paragraphs.push(getNodeText(node));
    }

    if (
      node.type === "image" &&
      typeof node.attrs?.src === "string" &&
      node.attrs.src
    ) {
      const src = node.attrs.src;
      const width = Number(node.attrs.width);
      const height = Number(node.attrs.height);

      gif = {
        id: src,
        title: typeof node.attrs.alt === "string" ? node.attrs.alt : "GIF",
        src,
        preview: src,
        width: Number.isFinite(width) && width > 0 ? width : 0,
        height: Number.isFinite(height) && height > 0 ? height : 0,
      };
    }
  }

  return {
    text: paragraphs.join("\n"),
    gif,
  };
}

function buildContent(text: string, gif: GifResult | null): JSONContent {
  const nodes: JSONContent[] = [];
  const trimmed = text.trim();

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

  return { type: "doc", content: nodes };
}

export function PredictionCommentEditInput({
  commentId,
  initialContent,
  prediction,
  onCancel,
  onSaved,
  onSavingChange,
}: PredictionCommentEditInputProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const { points, setPoints } = usePointBalance();

  const language = resolveLanguage(user?.language);
  const labels = PREDICTION_COMMENT_EDIT_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];
  const editLabels = COMMENT_EDIT_LABELS[language];

  const [initial] = useState(() => getInitialContent(initialContent));

  const [direction, setDirection] = useState<VoteDirection | null>(
    prediction.direction,
  );
  const [betAmount, setBetAmount] = useState(prediction.pointsBet);
  const [now, setNow] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  const submittingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    function updateTime() {
      setNow(Date.now());
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") updateTime();
    }

    const timer = window.setInterval(updateTime, 1000);

    window.addEventListener("focus", updateTime);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateTime);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const sessionMs = new Date(prediction.sessionDate).getTime();

  function getEditWindow(time: number) {
    const window = getVotingWindow(prediction.symbol, time);

    const editable =
      prediction.status === "PENDING" &&
      !window.isMarketOpen &&
      window.canVote &&
      Number.isFinite(sessionMs) &&
      window.predictionFor?.getTime() === sessionMs;

    return { window, editable };
  }

  const { window: votingWindow, editable } = getEditWindow(now);
  const voteLocked = !editable;

  const availablePoints = Math.max(
    0,
    points + (editable ? prediction.pointsBet : 0),
  );
  const maxBet = Math.floor(Math.min(500, availablePoints) / 50) * 50;

  function handleCancel() {
    if (isPending || submittingRef.current) return;
    onCancel();
  }

  function handleSave(text: string, gif: GifResult | null) {
    if (isPending || submittingRef.current) return;

    if (!user) {
      toast.error(actionLabels.login_required);
      return;
    }

    const canEditVoteNow = getEditWindow(Date.now()).editable;

    if (!canEditVoteNow && !voteLocked) {
      setNow(Date.now());

      toast.info(labels.closed_during_edit, {
        id: "prediction-edit-closed",
      });
      return;
    }

    let submittedPrediction:
      | { direction: VoteDirection; pointsBet: number }
      | undefined;

    if (canEditVoteNow) {
      if (!direction) {
        toast.error(labels.choose_direction);
        return;
      }

      if (
        !Number.isInteger(betAmount) ||
        betAmount < 0 ||
        betAmount > maxBet ||
        betAmount % 50 !== 0
      ) {
        toast.error(labels.invalid_points);
        return;
      }

      submittedPrediction = {
        direction,
        pointsBet: betAmount,
      };
    }

    const content = buildContent(text, gif);

    submittingRef.current = true;
    onSavingChange?.(true);

    startTransition(async () => {
      try {
        let result: EditResult;

        try {
          result = await editComment({
            commentId,
            content,
            ...(submittedPrediction ? { prediction: submittedPrediction } : {}),
          });
        } catch (error) {
          if (mountedRef.current) {
            setNow(Date.now());
            toast.error(getErrorMessage(error, editLabels.update_failed));
          }
          return;
        }

        if (result.points !== null) {
          setPoints(result.points);
        }

        try {
          if (mountedRef.current) {
            await onSaved(result);
          }

          toast.success(
            submittedPrediction ? labels.saved_combined : labels.saved_comment,
          );
        } catch (error) {
          console.error(
            "Saved prediction comment, but local UI update failed:",
            error,
          );
          toast.info(labels.saved_refreshing);
        } finally {
          router.refresh();
        }
      } finally {
        submittingRef.current = false;
        onSavingChange?.(false);
      }
    });
  }

  return (
    <div className="min-w-0">
      <PredictionCommentInput
        key={`${commentId}:${prediction.id}`}
        variant="popup"
        mode="edit-comment"
        showAvatar
        voteLocked={voteLocked}
        initialComment={initial.text}
        initialGif={initial.gif}
        onCancel={handleCancel}
        assetSymbol={prediction.symbol}
        onCommentCreated={() => {}}
        direction={voteLocked ? prediction.direction : direction}
        setDirection={setDirection}
        betAmount={voteLocked ? prediction.pointsBet : betAmount}
        setBetAmount={setBetAmount}
        userPoints={availablePoints}
        maxBet={maxBet}
        currentUser={user}
        isMarketOpen={votingWindow.isMarketOpen}
        buttonDisabled={!user}
        isPending={isPending}
        submitVote={handleSave}
        targetMs={votingWindow.targetMs}
        countdownType={votingWindow.countdownType}
        showCountdown={votingWindow.showCountdown}
      />
    </div>
  );
}
