"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MoreVertical, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";

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

export function MarketComments() {
  const [direction, setDirection] = useState("BULL");
  const [points, setPoints] = useState("50");

  return (
    <section className="w-full">
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-[13px] text-zinc-600 dark:text-zinc-500">
          Comment
        </h2>

        <span className="text-sm jakarta text-zinc-500">
          {DUMMY_COMMENTS.length}
        </span>
      </div>

      {/* Comment input */}
      <div className="mb-8 flex gap-3">
        <Avatar label="YJ" />

        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
            <div className="flex items-center gap-3  pt-2">
              <button
                type="button"
                onClick={() =>
                  setDirection((prev) => (prev === "BULL" ? "BEAR" : "BULL"))
                }
                className={`cursor-pointer
    relative flex h-8 w-[120px] items-center
    rounded-full p-0.5
    text-[14px] font-normal
    transition-colors duration-200

    ${direction === "BULL" ? "bg-emerald-600/15" : "bg-rose-700/15"}
  `}
              >
                {/* sliding background */}
                <span
                  className={`
      absolute top-0.5 h-7 w-[58px]
      rounded-full
      transition-transform duration-200 ease-out

      ${
        direction === "BULL"
          ? "translate-x-[58px] bg-emerald-600"
          : "translate-x-0 bg-rose-700"
      }
    `}
                />

                <span
                  className={`
      relative z-10 flex-1 text-center transition-colors
      ${direction === "BEAR" ? "text-white" : "text-zinc-500"}
    `}
                >
                  Bear
                </span>

                <span
                  className={`
      relative z-10 flex-1 text-center transition-colors
      ${direction === "BULL" ? "text-white" : "text-zinc-500"}
    `}
                >
                  Bull
                </span>
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  min={50}
                  max={1234}
                  step={50}
                  className="
                  text-sm
                 
                  text-zinc-500
    [field-sizing:content]
    min-w-[3.5ch]
    bg-transparent
    outline-none

    [&::-webkit-inner-spin-button]:opacity-100
    [&::-webkit-inner-spin-button]:cursor-pointer
  "
                />

                <span className="font-light text-zinc-500 jakarta text-sm">
                  / 1,234pts
                </span>
              </div>
            </div>
            <textarea
              rows={1}
              placeholder="Add a comment..."
              className="min-h-11 w-full resize-none bg-transparent py-3 text-[15px] outline-none placeholder:text-zinc-500"
            />

            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  GIF
                </button>
              </div>

              <Button
                size="sm"
                className="cursor-pointer bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-300 dark:hover:bg-zinc-200"
              >
                Vote
              </Button>
            </div>
          </div>
        </div>
      </div>

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

            {/* <VoteBadge vote={comment.vote} /> */}

            <span className="text-[13px] text-zinc-500">
              {comment.createdAt}
            </span>

            <button
              type="button"
              className="ml-auto rounded-full p-1.5 opacity-0 hover:bg-zinc-100 group-hover:opacity-100 dark:hover:bg-zinc-800"
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
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              <ThumbsUp className="size-4" />

              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>

            <button
              type="button"
              onClick={() => setReplying((prev) => !prev)}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
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
                    className="min-h-10 w-full resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-zinc-500"
                  />

                  <div className="flex items-center justify-between pb-2">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
              className="mt-3 flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
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

          {/* <VoteBadge vote={reply.vote} /> */}

          <span className="text-[13px] text-zinc-500">{reply.createdAt}</span>

          <button
            type="button"
            className="ml-auto rounded-full p-1.5 opacity-0 hover:bg-zinc-100 group-hover:opacity-100 dark:hover:bg-zinc-800"
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
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            <ThumbsUp className="size-4" />

            {reply.likes > 0 && <span>{reply.likes}</span>}
          </button>

          <button
            type="button"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
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
        flex shrink-0 items-center justify-center rounded-full
        bg-zinc-200 font-medium text-zinc-700
        dark:bg-zinc-700 dark:text-zinc-200
        ${small ? "size-8 text-xs" : "size-9 text-sm"}
      `}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}
