"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import Tiptap from "./tiptap";
import { toast } from "sonner";

import {
  getMarketVote,
  submitMarketVote,
  type VoteDirection,
} from "@/app/actions/market-vote";
import { VoteButton } from "@/app/components/vote-button";

import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { VotingCountdown } from "@/app/components/voting-countdown";

interface PostEditorProps {
  isLoggedIn: boolean;
  nationality: string | null;
}

export function PostEditor({
  nationality,

  isLoggedIn,
}: PostEditorProps) {
  const searchParams = useSearchParams();

  const name = searchParams.get("name");
  const symbol = searchParams.get("symbol");

  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(null);
  const [voteLoading, setVoteLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

  const [editorKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Load existing vote
  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function loadVote() {
      try {
        const vote = await getMarketVote({
          symbol: symbol!,
        });

        if (!cancelled) {
          setSelectedVote(vote);
          setVoteLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSelectedVote(null);
          setVoteLoading(false);
        }
      }
    }

    loadVote();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const votingWindow = symbol ? getVotingWindow(symbol, now) : null;

  const handleCountdownExpire = useCallback(() => {
    setNow(Date.now());
  }, []);

  const isMarketOpen = votingWindow?.isMarketOpen ?? false;

  const handleVote = (direction: VoteDirection) => {
    if (!isLoggedIn) {
      toast.error("Please log in to vote.");
      return;
    }

    if (!symbol) {
      toast.error("Market asset not found.");
      return;
    }

    if (!nationality) {
      toast.error("Please set your nationality before voting.");
      return;
    }

    if (isMarketOpen) {
      toast.error("Vote closed.");
      return;
    }

    startTransition(async () => {
      try {
        const vote = await submitMarketVote({
          symbol,
          nationality,
          direction,
        });

        setSelectedVote(vote.direction);

        toast.success(
          direction === "BULL"
            ? "Prediction to Bullish."
            : "Prediction to Bearish.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to submit prediction.",
        );
      }
    });
  };

  return (
    <div className="mt-5 flex h-full min-h-0 w-full flex-col">
      <div className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Tiptap
          key={editorKey}
          content={content}
          onChange={setContent}
          name={name || "..."}
        />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 pt-4">
        <VoteButton
          voteDirection="BULL"
          onClick={() => handleVote("BULL")}
          selectedVote={selectedVote}
          isPending={isPending || voteLoading}
          isMarketOpen={isMarketOpen}
        />

        <VoteButton
          voteDirection="BEAR"
          onClick={() => handleVote("BEAR")}
          selectedVote={selectedVote}
          isPending={isPending || voteLoading}
          isMarketOpen={isMarketOpen}
        />
      </div>{" "}
      {votingWindow && (
        <div className="ml-auto mt-2">
          <VotingCountdown
            targetMs={votingWindow.targetMs}
            type={votingWindow.countdownType}
            showCountdown={votingWindow.showCountdown}
            isMarketOpen={votingWindow.isMarketOpen}
            onExpire={handleCountdownExpire}
          />
        </div>
      )}
    </div>
  );
}
