"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import Tiptap from "./tiptap";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPost } from "@/app/actions/post";

interface PostEditorProps {
  onCancel?: () => void;
}

export function PostEditor({ onCancel }: PostEditorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const shouldRefreshPostList =
    pathname === "/" || pathname.startsWith("/forum");

  const handlePost = () => {
    if (!title.trim()) return;

    startTransition(async () => {
      try {
        const post = await createPost({
          title,
          content: structuredClone(content),
        });

        // Show success toast
        toast.custom(
          (toastId) => (
            <div
              key={post.id}
              onClick={() => {
                toast.dismiss(toastId);
                router.push(`/post/${post.slug}`);
              }}
              className="cursor-pointer flex w-90 items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              {post.thumbnail && (
                <img
                  src={post.thumbnail}
                  alt=""
                  className="h-14 w-18 shrink-0 rounded-md object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                  <span>Published in {post.asset?.name ?? "General"}</span>{" "}
                </div>

                <p className="mt-1 truncate text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                  {post.title}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.dismiss(toastId);
                }}
                className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ),
          {
            duration: Infinity,
          },
        );

        // Reset Section B
        setTitle("");

        setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });

        // Reset TipTap internal state
        setEditorKey((prev) => prev + 1);

        // Refresh Section A only when we're looking at a post list
        if (shouldRefreshPostList) {
          router.refresh();
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to publish post.",
        );
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* TITLE */}
      <div className="shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="
            w-full bg-transparent py-3
            text-[40px] font-semibold leading-tight
            outline-none placeholder:text-zinc-400
          "
        />
      </div>

      {/* EDITOR */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto hide-scrollbar">
        <div className="w-full min-w-0 max-w-full">
          <Tiptap key={editorKey} content={content} onChange={setContent} />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex shrink-0 items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
          className="text-[15px]"
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={handlePost}
          disabled={isPending || !title.trim()}
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
