"use client";

import {
  useCallback,
  useLayoutEffect,
  type KeyboardEventHandler,
  type RefObject,
} from "react";
import { toast } from "sonner";

const MAX_TEXTAREA_HEIGHT = 240;

interface CommentTextareaProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;

  value: string;
  onValueChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;

  placeholder: string;

  isLoggedIn: boolean;
  isChatRestricted: boolean;
  busy: boolean;

  loginMessage: string;
  restrictedMessage: string;
}

export function CommentTextarea({
  textareaRef,
  value,
  onValueChange,
  onKeyDown,
  placeholder,
  isLoggedIn,
  isChatRestricted,
  busy,
  loginMessage,
  restrictedMessage,
}: CommentTextareaProps) {
  const readOnly = !isLoggedIn || isChatRestricted || busy;
  const displayedValue = isLoggedIn ? value : "";

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const contentHeight = textarea.scrollHeight;

    textarea.style.height = `${Math.min(contentHeight, MAX_TEXTAREA_HEIGHT)}px`;

    textarea.style.overflowY =
      contentHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [textareaRef]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [displayedValue, resizeTextarea]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeTextarea);

      return () => {
        window.removeEventListener("resize", resizeTextarea);
      };
    }

    let previousWidth = textarea.getBoundingClientRect().width;

    const observer = new ResizeObserver(() => {
      const width = textarea.getBoundingClientRect().width;

      if (width === previousWidth) return;

      previousWidth = width;
      resizeTextarea();
    });

    observer.observe(textarea);

    return () => observer.disconnect();
  }, [textareaRef, resizeTextarea]);

  function handleClick() {
    if (!isLoggedIn) {
      toast.error(loginMessage.replace(/\.{3}$/, ""));
      return;
    }

    if (isChatRestricted) {
      toast.error(restrictedMessage);
    }
  }

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={displayedValue}
      readOnly={readOnly}
      aria-disabled={readOnly}
      aria-label={placeholder}
      placeholder={placeholder}
      onChange={(event) => {
        if (readOnly) return;

        onValueChange(event.target.value);
      }}
      onKeyDown={onKeyDown}
      onClick={handleClick}
      style={{ overflowX: "hidden" }}
      className={`
        content-scrollbar block min-h-11 w-full
        resize-none overflow-hidden bg-transparent
        px-1.5 py-4 text-[15px] leading-6 outline-none
        placeholder:truncate
        placeholder:text-zinc-800 dark:placeholder:text-zinc-300
        ${
          isChatRestricted
            ? "cursor-not-allowed caret-transparent opacity-60"
            : readOnly
              ? "cursor-default caret-transparent"
              : ""
        }
      `}
    />
  );
}
