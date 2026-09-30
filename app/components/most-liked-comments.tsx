"use client";

import type { JSONContent } from "@tiptap/react";

import { useRouter } from "next/navigation";

import { RiHeartFill } from "react-icons/ri";
import { BiSolidChat } from "react-icons/bi";

import { toast } from "sonner";

import { checkCommentExists, type MostLikedComment } from "@/app/actions/query";

interface MostLikedCommentsProps {
  comments: MostLikedComment[];
}

function getTextFromContent(content: JSONContent): string {
  if (content.type === "text") {
    return content.text ?? "";
  }

  if (!content.content) {
    return "";
  }

  return content.content.map(getTextFromContent).join(" ");
}

export function MostLikedComments({ comments }: MostLikedCommentsProps) {
  const router = useRouter();

  const handleCommentClick = async (commentId: string, symbol: string) => {
    try {
      const exists = await checkCommentExists(commentId);

      if (!exists) {
        toast.error("Comment deleted.");
        return;
      }

      router.push(
        `/${encodeURIComponent(
          symbol,
        )}?comment=${encodeURIComponent(commentId)}&from=most-liked`,
      );
    } catch (error) {
      console.error("Failed to check comment:", error);

      toast.error("Unable to open comment.");
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {comments.map((comment) => {
        const primaryAsset = comment.assets[0]?.asset;

        if (!primaryAsset) {
          return null;
        }

        const text = getTextFromContent(comment.content);

        return (
          <button
            key={comment.id}
            type="button"
            onClick={() =>
              void handleCommentClick(comment.id, primaryAsset.symbol)
            }
            className="
              block
              w-full
              cursor-pointer
              rounded-xl
              bg-zinc-100/70
              px-3.5
              py-3.5
              text-left
              transition-colors
              hover:bg-zinc-200/70

              dark:bg-zinc-800/45
              dark:hover:bg-zinc-800/75
            "
          >
            {/* ---------------------------------------------------------- */}
            {/* Asset                                                      */}
            {/* ---------------------------------------------------------- */}

            <div className="mb-2 flex flex-wrap gap-1.5">
              {comment.assets.map(({ asset }) => (
                <span
                  key={asset.symbol}
                  className="
                    inline-flex
                    rounded-full
                    border
                    border-zinc-400
                    bg-transparent
                    px-2.5
                    py-1
                    text-[12px]
                    font-medium
                    text-zinc-600

                    dark:border-zinc-600
                    dark:text-zinc-300
                  "
                >
                  {asset.displaySymbol ?? asset.symbol}
                </span>
              ))}
            </div>

            {/* ---------------------------------------------------------- */}
            {/* Comment                                                    */}
            {/* ---------------------------------------------------------- */}

            <p
              className="
                line-clamp-2
                text-[15px]
                font-normal
                leading-normal
                text-zinc-900

                dark:font-light
                dark:text-zinc-300
              "
            >
              {text}
            </p>

            {/* ---------------------------------------------------------- */}
            {/* Stats                                                      */}
            {/* ---------------------------------------------------------- */}

            <div
              className="
                mt-3
                flex
                items-center
                gap-3
                text-[12px]
                text-zinc-500

                dark:text-zinc-500
              "
            >
              {/* Likes */}

              <span className="jakarta ml-auto flex items-center gap-1">
                <RiHeartFill
                  className="
                    h-4
                    w-4
                    fill-zinc-500
                    text-muted

                    dark:fill-zinc-300
                    dark:text-muted
                  "
                />

                {comment._count.likes}
              </span>

              {/* Replies */}

              <span className="jakarta flex items-center gap-1">
                <BiSolidChat
                  className="
                    h-4
                    w-4
                    fill-zinc-500
                    text-muted

                    dark:fill-zinc-300
                    dark:text-muted
                  "
                />

                {comment._count.replies}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
