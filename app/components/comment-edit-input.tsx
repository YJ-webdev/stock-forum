"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import type { JSONContent } from "@tiptap/react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GifPicker, type GifResult } from "./gif-picker";

import { editComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_EDIT_LABELS,
  CONTENT_RESULT_LABELS,
} from "@/lib/data/translations";

interface CommentEditInputProps {
  commentId: string;
  initialContent: JSONContent;
  onCancel: () => void;
  onSaved: (result: {
    success: boolean;
    content: JSONContent;
    editedAt: Date;
  }) => void | Promise<void>;
}

interface EditableGif {
  src: string;
  preview?: string;
  title: string;
}

export function CommentEditInput({
  commentId,
  initialContent,
  onCancel,
  onSaved,
}: CommentEditInputProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);

  const labels = COMMENT_EDIT_LABELS[language];
  const resultLabels = CONTENT_RESULT_LABELS[language];

  const [initial] = useState(() => getInitialComment(initialContent));

  const [comment, setComment] = useState(initial.text);
  const [selectedGif, setSelectedGif] = useState<EditableGif | null>(
    initial.gif,
  );

  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resizeTextarea = () => {
      const maxHeight = 240;

      textarea.style.height = "auto";

      const contentHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(contentHeight, maxHeight)}px`;
      textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
    };

    resizeTextarea();

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
  }, [comment]);

  const hasChanges =
    comment.trim() !== initial.text.trim() ||
    (selectedGif?.src ?? null) !== (initial.gif?.src ?? null);

  const hasContent = comment.trim().length > 0 || Boolean(selectedGif);
  const saveDisabled = isPending || !hasChanges || !hasContent;

  const handleGifSelect = (gif: GifResult) => {
    if (isPending) return;

    setSelectedGif({
      src: gif.src,
      preview: gif.preview,
      title: gif.title,
    });

    setGifPickerOpen(false);
  };

  const handleSave = () => {
    if (saveDisabled) return;

    startTransition(async () => {
      try {
        const text = comment.trim();
        const nodes: JSONContent[] = [];

        if (text) {
          for (const line of text.split(/\r\n|\r|\n/)) {
            nodes.push({
              type: "paragraph",
              content: line
                ? [
                    {
                      type: "text",
                      text: line,
                    },
                  ]
                : [],
            });
          }
        }

        if (selectedGif) {
          nodes.push({
            type: "image",
            attrs: {
              src: selectedGif.src,
              alt: selectedGif.title,
            },
          });
        }

        const content: JSONContent = {
          type: "doc",
          content: nodes,
        };

        const result = await editComment({
          commentId,
          content,
        });

        if (!result.success) {
          toast.error(labels.update_failed);
          return;
        }

        await onSaved(result);

        toast.success(resultLabels.edited);
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : labels.update_failed,
        );
      }
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isPending || event.nativeEvent.isComposing) return;

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="rounded-lg bg-zinc-100 px-3 pt-3 dark:bg-zinc-800">
      {/* Text */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={comment}
        disabled={isPending}
        onChange={(event) => setComment(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={labels.placeholder}
        aria-label={labels.placeholder}
        style={{
          marginBottom: 16,
          overflowX: "hidden",
        }}
        className="
          content-scrollbar block min-h-10 w-full resize-none
          overflow-hidden bg-transparent
          text-[15px] leading-6 outline-none
          placeholder:text-zinc-400
          disabled:opacity-60
        "
      />

      {/* GIF preview */}
      {selectedGif && (
        <div className="relative mb-2 w-fit max-w-full">
          <img
            src={selectedGif.preview || selectedGif.src}
            alt={selectedGif.title}
            className="
              block max-h-52 w-auto max-w-full
              rounded-lg object-contain
            "
          />

          <button
            type="button"
            disabled={isPending}
            onClick={() => setSelectedGif(null)}
            aria-label={labels.remove_gif}
            title={labels.remove_gif}
            className="
              absolute top-2 right-2
              flex size-7 cursor-pointer items-center justify-center
              rounded-full bg-black/60 text-white
              transition-colors hover:bg-black/75
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="relative">
          <button
            ref={gifButtonRef}
            type="button"
            disabled={isPending}
            onClick={() => setGifPickerOpen((previous) => !previous)}
            aria-label={labels.select_gif}
            title={labels.select_gif}
            aria-expanded={gifPickerOpen}
            className="
              cursor-pointer rounded-md px-2 py-1
              text-sm font-medium text-zinc-500
              hover:bg-zinc-200
              disabled:cursor-not-allowed disabled:opacity-50
              dark:hover:bg-zinc-700
            "
          >
            GIF
          </button>

          <GifPicker
            open={gifPickerOpen}
            onOpenChange={setGifPickerOpen}
            onSelect={handleGifSelect}
            triggerRef={gifButtonRef}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={onCancel}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {labels.cancel}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saveDisabled}
            onClick={handleSave}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? labels.saving : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getNodeText(node: JSONContent): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  return (node.content ?? []).map(getNodeText).join("");
}

function getInitialComment(content: JSONContent): {
  text: string;
  gif: EditableGif | null;
} {
  const paragraphs: string[] = [];
  let gif: EditableGif | null = null;

  for (const node of content.content ?? []) {
    if (node.type === "paragraph") {
      paragraphs.push(getNodeText(node));
    }

    if (node.type === "image" && node.attrs?.src) {
      const src = String(node.attrs.src);

      gif = {
        src,
        preview: src,
        title: String(node.attrs.alt ?? "GIF"),
      };
    }
  }

  return {
    text: paragraphs.join("\n"),
    gif,
  };
}
