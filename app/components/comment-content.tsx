"use client";

import type { JSONContent } from "@tiptap/react";
import { useEffect, useId, useRef, useState } from "react";

export function CommentContent({ content }: { content: JSONContent }) {
  const contentId = useId();
  const textRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [content]);

  useEffect(() => {
    const element = textRef.current;

    if (!element || expanded) {
      return;
    }

    const checkOverflow = () => {
      setHasOverflow(element.scrollHeight > element.clientHeight + 1);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => observer.disconnect();
  }, [content, expanded]);

  return (
    <div
      className="
        mt-0.5 min-w-0
        text-[15px] leading-6
        text-zinc-900 dark:text-zinc-200 w-full
      "
    >
      <div
        id={contentId}
        ref={textRef}
        className={`
          min-w-0 space-y-2 wrap-anywhere
          ${expanded ? "" : "line-clamp-6"}
        `}
      >
        {content.content?.map((node, index) => {
          if (node.type !== "paragraph" || !node.content?.length) {
            return null;
          }

          return (
            <p key={index} className="min-w-0 whitespace-pre-wrap">
              {node.content.map((child, childIndex) => {
                if (child.type === "hardBreak") {
                  return <br key={childIndex} />;
                }

                if (child.type === "text") {
                  return child.text ?? "";
                }

                return null;
              })}
            </p>
          );
        })}
      </div>

      {hasOverflow && (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            aria-controls={contentId}
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((previous) => !previous);
            }}
            className="
              cursor-pointer rounded-md px-3 py-1
              text-xs font-medium
              text-zinc-500 hover:text-zinc-900
              dark:text-zinc-400 dark:hover:text-zinc-200
            "
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        </div>
      )}

      {content.content?.map((node, index) => {
        if (node.type !== "image" || !node.attrs?.src) {
          return null;
        }

        return (
          <img
            key={index}
            src={String(node.attrs.src)}
            alt={String(node.attrs.alt ?? "GIF")}
            className="
              mt-2 block h-auto
              max-h-64 max-w-56
              rounded-xl object-contain
            "
          />
        );
      })}
    </div>
  );
}
