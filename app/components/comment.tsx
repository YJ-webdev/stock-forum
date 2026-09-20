"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MoreVertical, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PredictionCommentInput } from "./prediction-comment-input";
import { CommentOnlyInput } from "./comment-only-input";

type VoteDirection = "BULL" | "BEAR";

interface DummyComment {
  id: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: string;
  likes: number;
  vote: VoteDirection;
  replies?: DummyComment[];
}

interface MarketCommentsProps {
  selectedVote: VoteDirection | null;
  voteLoading: boolean;
  isMarketOpen: boolean;
  userPoints: number;
  betAmount: number;
  setBetAmount: React.Dispatch<React.SetStateAction<number>>;
  handleVote: (direction: VoteDirection, betAmount: number) => void;

  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
}

const DUMMY_COMMENTS: DummyComment[] = [
  {
    id: "1",
    username: "marketking",
    avatar: "MK",
    content:
      "Nikkei looks pretty strong here. I'm curious what happens around the next session.",
    createdAt: "3m",
    likes: 17,
    vote: "BULL",
    replies: [
      {
        id: "1-1",
        username: "investor92",
        avatar: "I",
        content: "The yen is what I'm watching right now.",
        createdAt: "1m",
        likes: 4,
        vote: "BEAR",
      },
      {
        id: "1-2",
        username: "YJ",
        avatar: "YJ",
        content: "Same. USD/JPY could make tomorrow interesting.",
        createdAt: "Just now",
        likes: 2,
        vote: "BULL",
      },
    ],
  },
  {
    id: "2",
    username: "tokyotrader",
    avatar: "T",
    content: "64,000 is going to be an interesting level.",
    createdAt: "8m",
    likes: 31,
    vote: "BEAR",
    replies: [
      {
        id: "2-1",
        username: "marketking",
        avatar: "MK",
        content: "Yeah, I want to see whether it holds.",
        createdAt: "5m",
        likes: 6,
        vote: "BULL",
      },
    ],
  },
];

export function MarketComments({
  selectedVote,
  voteLoading,
  isMarketOpen,
  userPoints,
  handleVote,
  betAmount,
  setBetAmount,
  targetMs,
  countdownType,
  showCountdown,
}: MarketCommentsProps) {
  const [direction, setDirection] = useState<VoteDirection | null>(null);

  const hasEnoughPoints = userPoints >= 50;
  const hasAlreadyVoted = selectedVote !== null;

  const maxBet = Math.min(500, userPoints);

  const buttonDisabled = voteLoading || isMarketOpen;

  const submitVote = () => {
    if (buttonDisabled) return;

    if (!direction) {
      toast.error("Please choose Bull or Bear.");
      return;
    }

    if (betAmount < 50) {
      toast.error("Minimum prediction is 50 points.");
      return;
    }

    if (betAmount > maxBet) {
      toast.error(`You can predict up to ${maxBet.toLocaleString()} points.`);
      return;
    }

    handleVote(direction, betAmount);
  };
  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-[13px] text-zinc-600 dark:text-zinc-500">
          Comment
        </h2>

        <span className="jakarta text-sm text-zinc-500">
          {DUMMY_COMMENTS.length}
        </span>
      </div>

      {hasAlreadyVoted ? (
        <CommentOnlyInput
          targetMs={targetMs}
          countdownType={countdownType}
          showCountdown={showCountdown}
          isMarketOpen={isMarketOpen}
        />
      ) : (
        <PredictionCommentInput
          direction={direction}
          setDirection={setDirection}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          userPoints={userPoints}
          maxBet={maxBet}
          voteLoading={voteLoading}
          isMarketOpen={isMarketOpen}
          buttonDisabled={buttonDisabled}
          submitVote={submitVote}
          targetMs={targetMs}
          countdownType={countdownType}
          showCountdown={showCountdown}
        />
      )}
      {/* Comments */}
      <div>
        {DUMMY_COMMENTS.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </section>
  );
}

function CommentItem({ comment }: { comment: DummyComment }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);

  const replyCount = comment.replies?.length ?? 0;

  return (
    <div className="mb-6">
      <div className="group flex gap-3">
        <Avatar label={comment.avatar} />

        <div className="min-w-0 flex-1">
          {/* User */}
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold">
              {comment.username}
            </span>

            <span className="text-[13px] text-zinc-500">
              {comment.createdAt}
            </span>

            <button
              type="button"
              className="
                ml-auto rounded-full p-1.5
                opacity-0
                hover:bg-zinc-100
                group-hover:opacity-100
                dark:hover:bg-zinc-800
              "
            >
              <MoreVertical className="size-4" />
            </button>
          </div>

          {/* Content */}
          <p className="mt-0.5 text-[15px] leading-6 text-zinc-900 dark:text-zinc-200">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              className="
                flex items-center gap-1.5
                text-sm text-zinc-500
                hover:text-zinc-900
                dark:hover:text-zinc-200
              "
            >
              <ThumbsUp className="size-4" />

              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>

            <button
              type="button"
              onClick={() => setReplying((prev) => !prev)}
              className="
                text-sm font-medium text-zinc-500
                hover:text-zinc-900
                dark:hover:text-zinc-200
              "
            >
              Reply
            </button>
          </div>

          {/* Reply input */}
          {replying && (
            <div className="mt-3 flex gap-2">
              <Avatar label="YJ" small />

              <div className="min-w-0 flex-1">
                <div className="rounded-lg bg-zinc-100 px-3 dark:bg-zinc-800">
                  <textarea
                    autoFocus
                    rows={1}
                    placeholder={`Reply to ${comment.username}...`}
                    className="
                      min-h-10 w-full resize-none
                      bg-transparent py-2.5
                      text-[15px] outline-none
                      placeholder:text-zinc-500
                    "
                  />

                  <div className="flex items-center justify-between pb-2">
                    <button
                      type="button"
                      className="
                        rounded-md px-2 py-1
                        text-xs font-medium text-zinc-500
                        hover:bg-zinc-200
                        dark:hover:bg-zinc-700
                      "
                    >
                      GIF
                    </button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplying(false)}
                      >
                        Cancel
                      </Button>

                      <Button type="button" size="sm">
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show replies */}
          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((prev) => !prev)}
              className="
                mt-3 flex items-center gap-2
                text-sm font-semibold text-zinc-600
                hover:text-zinc-900
                dark:text-zinc-400
                dark:hover:text-zinc-200
              "
            >
              {showReplies ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Replies */}
          {showReplies && comment.replies && (
            <div className="relative mt-4 space-y-5 pl-4">
              <div className="absolute bottom-3 left-0 top-0 w-px bg-zinc-200 dark:bg-zinc-800" />

              {comment.replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyItem({ reply }: { reply: DummyComment }) {
  return (
    <div className="group flex gap-3">
      <Avatar label={reply.avatar} small />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold">{reply.username}</span>

          <span className="text-[13px] text-zinc-500">{reply.createdAt}</span>

          <button
            type="button"
            className="
              ml-auto rounded-full p-1.5
              opacity-0
              hover:bg-zinc-100
              group-hover:opacity-100
              dark:hover:bg-zinc-800
            "
          >
            <MoreVertical className="size-4" />
          </button>
        </div>

        <p className="mt-0.5 text-[15px] leading-6 text-zinc-900 dark:text-zinc-200">
          {reply.content}
        </p>

        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            className="
              flex items-center gap-1.5
              text-sm text-zinc-500
              hover:text-zinc-900
              dark:hover:text-zinc-200
            "
          >
            <ThumbsUp className="size-4" />

            {reply.likes > 0 && <span>{reply.likes}</span>}
          </button>

          <button
            type="button"
            className="
              text-sm font-medium text-zinc-500
              hover:text-zinc-900
              dark:hover:text-zinc-200
            "
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <div
      className={`
        flex shrink-0 items-center justify-center
        rounded-full
        bg-zinc-200 font-medium text-zinc-700
        dark:bg-zinc-700 dark:text-zinc-200

        ${small ? "size-8 text-xs" : "size-9 text-sm"}
      `}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}
