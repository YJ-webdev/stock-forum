"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import Tiptap from "./tiptap";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  getMarketVote,
  submitMarketVote,
  type VoteDirection,
} from "@/app/actions/market-vote";

interface PostEditorProps {
  nationality: string | null;
  predictionFor: Date;
}

export function PostEditor({ nationality, predictionFor }: PostEditorProps) {
  const searchParams = useSearchParams();

  const name = searchParams.get("name");
  const symbol = searchParams.get("symbol");

  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(null);

  const [voteLoading, setVoteLoading] = useState(true);

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
          predictionFor,
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
  }, [symbol, predictionFor]);

  const handleVote = (direction: VoteDirection) => {
    if (!symbol) {
      toast.error("Market asset not found.");
      return;
    }

    if (!nationality) {
      toast.error("Please set your nationality before voting.");
      return;
    }

    startTransition(async () => {
      try {
        const vote = await submitMarketVote({
          symbol,
          nationality,
          predictionFor,
          direction,
        });

        setSelectedVote(vote.direction);

        toast.success(
          direction === "BULL"
            ? "Prediction changed to Bullish."
            : "Prediction changed to Bearish.",
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
        <div className="w-full min-w-0 max-w-full">
          <Tiptap
            key={editorKey}
            content={content}
            onChange={setContent}
            name={name || "..."}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          onClick={() => handleVote("BULL")}
          disabled={isPending || voteLoading}
          variant={selectedVote === "BULL" ? "default" : "outline"}
          className={
            selectedVote === "BULL"
              ? "bg-emerald-600 text-[15px] text-white hover:bg-emerald-600"
              : "text-[15px]"
          }
        >
          Bullish
        </Button>

        <Button
          type="button"
          onClick={() => handleVote("BEAR")}
          disabled={isPending || voteLoading}
          variant={selectedVote === "BEAR" ? "default" : "outline"}
          className={
            selectedVote === "BEAR"
              ? "bg-rose-700 text-[15px] text-white hover:bg-rose-700"
              : "text-[15px]"
          }
        >
          Bearish
        </Button>
      </div>
    </div>
  );
}
