"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { editComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { usePointBalance } from "@/app/context/point-balance-context";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_LABELS,
  COMMENT_ACTION_LABELS,
  COMMENT_EDIT_LABELS,
  PREDICTION_COMMENT_EDIT_LABELS,
} from "@/lib/data/translations";

import type { CommentImage } from "@/lib/types/comment-image";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { isDeletedPredictionContent } from "@/lib/utils/is-deleted-prediction-content";
import { buildCommentContent } from "@/lib/utils/build-comment-content";

import { PredictionCommentInput } from "./prediction-comment-input";
import type { GifResult } from "./gif-picker";

type VoteDirection = "BULL" | "BEAR";
type EditResult = Awaited<ReturnType<typeof editComment>>;
type VotingWindow = ReturnType<typeof getVotingWindow>;

const POINT_STEP = 50;
const MAX_PREDICTION_POINTS = 500;

interface PredictionCommentEditInputProps {
  refreshOnSaved?: boolean;
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

interface InitialContent {
  text: string;
  gif: GifResult | null;
  image: CommentImage | null;
}

function getNodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  return (node.content ?? []).map(getNodeText).join("");
}

function getDimension(value: unknown): number | null {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : null;
}

function getInitialContent(content: JSONContent): InitialContent {
  if (isDeletedPredictionContent(content)) {
    return {
      text: "",
      gif: null,
      image: null,
    };
  }

  const paragraphs: string[] = [];

  let gif: GifResult | null = null;
  let image: CommentImage | null = null;

  for (const node of content.content ?? []) {
    if (node.type === "paragraph") {
      paragraphs.push(getNodeText(node));
    }

    if (
      node.type !== "image" ||
      typeof node.attrs?.src !== "string" ||
      !node.attrs.src.trim()
    ) {
      continue;
    }

    const src = node.attrs.src;
    const width = getDimension(node.attrs.width);
    const height = getDimension(node.attrs.height);

    if (node.attrs.mediaType === "image") {
      image = {
        src,
        title: typeof node.attrs.alt === "string" ? node.attrs.alt : "Image",
        width: width ?? 1,
        height: height ?? 1,
        mediaType: "image",
      };

      gif = null;
    } else {
      // Existing image nodes without mediaType are legacy GIFs.
      gif = {
        id: src,
        src,
        preview: src,
        title: typeof node.attrs.alt === "string" ? node.attrs.alt : "GIF",
        width: width ?? 0,
        height: height ?? 0,
      };

      image = null;
    }
  }

  return {
    text: paragraphs.join("\n"),
    gif,
    image,
  };
}

function hasSameVotingState(previous: VotingWindow, next: VotingWindow) {
  return (
    previous.isMarketOpen === next.isMarketOpen &&
    previous.canVote === next.canVote &&
    previous.predictionFor?.getTime() === next.predictionFor?.getTime() &&
    previous.targetMs === next.targetMs &&
    previous.countdownType === next.countdownType &&
    previous.showCountdown === next.showCountdown
  );
}

export function PredictionCommentEditInput({
  refreshOnSaved = true,
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
  const commentLabels = COMMENT_LABELS[language];
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
    function updateVotingState() {
      if (document.visibilityState !== "visible") return;

      const currentTime = Date.now();
      const next = getVotingWindow(prediction.symbol, currentTime);

      setNow((previousTime) => {
        const previous = getVotingWindow(prediction.symbol, previousTime);

        return hasSameVotingState(previous, next) ? previousTime : currentTime;
      });
    }

    updateVotingState();

    const timer = window.setInterval(updateVotingState, 1000);

    window.addEventListener("focus", updateVotingState);
    document.addEventListener("visibilitychange", updateVotingState);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateVotingState);
      document.removeEventListener("visibilitychange", updateVotingState);
    };
  }, [prediction.symbol]);

  const sessionMs = new Date(prediction.sessionDate).getTime();

  function getEditWindow(time: number) {
    const votingWindow = getVotingWindow(prediction.symbol, time);

    const editable =
      prediction.status === "PENDING" &&
      !votingWindow.isMarketOpen &&
      votingWindow.canVote &&
      Number.isFinite(sessionMs) &&
      votingWindow.predictionFor?.getTime() === sessionMs;

    return {
      votingWindow,
      editable,
    };
  }

  const { votingWindow, editable } = getEditWindow(now);
  const voteLocked = !editable;

  const availablePoints = Math.max(
    0,
    points + (editable ? prediction.pointsBet : 0),
  );

  const maxBet =
    Math.floor(Math.min(MAX_PREDICTION_POINTS, availablePoints) / POINT_STEP) *
    POINT_STEP;

  const hasClosingTarget = votingWindow.countdownType === "VOTING_CLOSES";

  const showClosingCountdown = hasClosingTarget && votingWindow.showCountdown;

  function handleCancel() {
    if (isPending || submittingRef.current) return;

    onCancel();
  }

  function handleSave(
    text: string,
    gif: GifResult | null,
    image: CommentImage | null,
  ) {
    if (isPending || submittingRef.current) return;

    if (!user) {
      toast.error(actionLabels.login_required);
      return;
    }

    if (user.status === "MUTED" || user.status === "BANNED") {
      toast.error(commentLabels.restricted);
      return;
    }

    const currentTime = Date.now();
    const canEditVoteNow = getEditWindow(currentTime).editable;

    if (!canEditVoteNow && !voteLocked) {
      setNow(currentTime);
      toast.info(labels.closed_during_edit);
      return;
    }

    let submittedPrediction:
      | {
          direction: VoteDirection;
          pointsBet: number;
        }
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
        betAmount % POINT_STEP !== 0
      ) {
        toast.error(labels.invalid_points);
        return;
      }

      submittedPrediction = {
        direction,
        pointsBet: betAmount,
      };
    }

    const content = buildCommentContent(text, gif, image);

    submittingRef.current = true;

    startTransition(async () => {
      try {
        onSavingChange?.(true);

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
          if (refreshOnSaved) {
            router.refresh();
          }
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
        initialImage={initial.image}
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
        targetMs={hasClosingTarget ? votingWindow.targetMs : null}
        countdownType={hasClosingTarget ? "VOTING_CLOSES" : null}
        showCountdown={showClosingCountdown}
      />
    </div>
  );
}
