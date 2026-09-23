"use client";

import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { Ellipsis, MessageCircle } from "lucide-react";
import { RiHeartFill } from "react-icons/ri";
import Link from "next/link";

import { type MostLikedComment } from "@/app/actions/post";

interface MostLikedCommentsProps {
  comments: MostLikedComment[];
}

const ITEMS_PER_PAGE = 5;

function getTextFromContent(content: JSONContent): string {
  if (content.type === "text") {
    return content.text ?? "";
  }

  if (!content.content) {
    return "";
  }

  return content.content.map(getTextFromContent).join(" ");
}

export function MostLikedComments({
  comments: initialComments,
}: MostLikedCommentsProps) {
  const [comments, setComments] = useState<MostLikedComment[]>(initialComments);

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const visibleComments = comments.slice(0, visibleCount);
  const hasMore = visibleCount < comments.length;

  // Reset when comments from the server change.
  useEffect(() => {
    setComments(initialComments);
    setVisibleCount(ITEMS_PER_PAGE);
  }, [initialComments]);

  // Load another 5 when the dots enter the visible area.
  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setVisibleCount((current) =>
          Math.min(current + ITEMS_PER_PAGE, comments.length),
        );
      },
      {
        rootMargin: "100px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [comments.length, hasMore]);

  return (
    <div className="flex flex-col gap-2.5">
      {visibleComments.map((comment) => {
        const primaryAsset = comment.assets[0]?.asset;

        if (!primaryAsset) {
          return null;
        }

        const text = getTextFromContent(comment.content);

        return (
          <Link
            key={comment.id}
            href={`/${encodeURIComponent(primaryAsset.symbol)}?comment=${encodeURIComponent(comment.id)}`}
            className="
              block rounded-xl
              bg-zinc-100/70 px-3.5 py-3.5
              transition-colors
              hover:bg-zinc-200/70
              dark:bg-zinc-800/45
              dark:hover:bg-zinc-800/75
            "
          >
            {/* Asset */}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {comment.assets.map(({ asset }) => (
                <span
                  key={asset.symbol}
                  className="
                    inline-flex rounded-full
                    border border-zinc-400
                    bg-transparent px-2.5 py-1
                    text-[12px] font-medium text-zinc-600
                    dark:border-zinc-600
                    dark:text-zinc-300
                  "
                >
                  {asset.displaySymbol ?? asset.symbol}
                </span>
              ))}
            </div>

            {/* Comment */}
            <p
              className="
                line-clamp-2
                text-[15px] font-normal
                leading-normal text-zinc-900
                dark:font-light
                dark:text-zinc-300
              "
            >
              {text}
            </p>

            {/* Stats */}
            <div
              className="
                mt-3 flex items-center gap-3
                text-[12px] text-zinc-500
                dark:text-zinc-500
              "
            >
              <span className="jakarta ml-auto flex items-center gap-1">
                <RiHeartFill
                  className="
                    h-4 w-4 fill-none
                    text-zinc-600
                    dark:fill-zinc-300
                    dark:text-muted
                  "
                />

                {comment._count.likes}
              </span>

              <span className="jakarta flex items-center gap-1">
                <MessageCircle
                  className="
                    h-4 w-4 fill-none
                    text-zinc-600
                    dark:fill-zinc-300
                    dark:text-muted
                  "
                  strokeWidth={1.5}
                />

                {comment._count.replies}
              </span>
            </div>
          </Link>
        );
      })}

      {/* Load more sentinel */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="
            flex h-10
            items-center justify-center
          "
        >
          <Ellipsis
            className="
              h-4 w-4
              text-zinc-400
              dark:text-zinc-600
            "
          />
        </div>
      )}
    </div>
  );
}
