"use client";

import { useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GifPicker, type GifResult } from "./gif-picker";
import { editComment } from "@/app/actions/post";

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
  // ---------------------------------------------------------------------------
  // INITIAL CONTENT
  // ---------------------------------------------------------------------------

  const initial = getInitialComment(initialContent);

  const initialText = initial.text;
  const initialGifSrc = initial.gif?.src ?? null;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [comment, setComment] = useState(initial.text);

  const [selectedGif, setSelectedGif] = useState<EditableGif | null>(
    initial.gif,
  );

  const [gifPickerOpen, setGifPickerOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  const hasChanges =
    comment.trim() !== initialText.trim() ||
    (selectedGif?.src ?? null) !== initialGifSrc;

  const hasContent = comment.trim().length > 0 || Boolean(selectedGif);

  const saveDisabled = isPending || !hasChanges || !hasContent;

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------

  const handleSave = () => {
    if (saveDisabled) return;

    startTransition(async () => {
      try {
        const content: JSONContent = {
          type: "doc",

          content: [
            ...(comment.trim()
              ? [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: comment.trim(),
                      },
                    ],
                  },
                ]
              : []),

            ...(selectedGif
              ? [
                  {
                    type: "image",
                    attrs: {
                      src: selectedGif.src,
                      alt: selectedGif.title,
                    },
                  },
                ]
              : []),
          ],
        };

        const result = await editComment({
          commentId,
          content,
        });

        await onSaved(result);

        toast.success("Comment updated.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update comment.",
        );
      }
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="mt-2">
      <div className="relative rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
        {/* Text */}
        <textarea
          autoFocus
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={1}
          placeholder="Edit comment..."
          className="
            min-h-11 w-full resize-none
            bg-transparent py-3
            text-[15px] outline-none
            placeholder:text-zinc-500
          "
        />

        {/* Selected GIF */}
        {selectedGif && (
          <div className="relative mb-3 w-fit max-w-full">
            <img
              src={selectedGif.preview || selectedGif.src}
              alt={selectedGif.title}
              className="
                block max-h-60 max-w-full
                rounded-lg object-contain
              "
            />

            <button
              type="button"
              onClick={() => setSelectedGif(null)}
              disabled={isPending}
              className="
                absolute right-2 top-2
                flex size-7 cursor-pointer
                items-center justify-center
                rounded-full
                bg-black/60 text-white
                hover:bg-black/75
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex items-center justify-between gap-2 pb-2">
          {/* GIF */}
          <div className="relative">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setGifPickerOpen((open) => !open)}
              className="
                cursor-pointer rounded-md
                px-2 py-1
                text-sm font-medium text-zinc-500
                hover:bg-zinc-200
                disabled:cursor-not-allowed
                disabled:opacity-50
                dark:hover:bg-zinc-700
              "
            >
              GIF
            </button>

            <GifPicker
              open={gifPickerOpen}
              onOpenChange={setGifPickerOpen}
              onSelect={(gif: GifResult) => {
                setSelectedGif({
                  src: gif.src,
                  preview: gif.preview,
                  title: gif.title,
                });

                setGifPickerOpen(false);
              }}
            />
          </div>

          {/* Cancel / Save */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={onCancel}
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={saveDisabled}
              onClick={handleSave}
              className="
                cursor-pointer
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// GET INITIAL COMMENT
// -----------------------------------------------------------------------------

function getInitialComment(content: JSONContent): {
  text: string;
  gif: EditableGif | null;
} {
  let text = "";
  let gif: EditableGif | null = null;

  for (const node of content.content ?? []) {
    // Text
    if (node.type === "paragraph") {
      const paragraphText =
        node.content?.map((child) => child.text ?? "").join("") ?? "";

      if (paragraphText) {
        text = text ? `${text}\n${paragraphText}` : paragraphText;
      }
    }

    // GIF
    if (node.type === "image" && node.attrs?.src) {
      gif = {
        src: String(node.attrs.src),
        preview: String(node.attrs.src),
        title: String(node.attrs.alt ?? "GIF"),
      };
    }
  }

  return {
    text,
    gif,
  };
}
