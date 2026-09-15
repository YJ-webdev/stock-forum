"use client";

import { useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";

import Tiptap from "./tiptap";
import { Button } from "@/components/ui/button";
import { CategoryWithCount } from "@/types/forum";
import { createPost } from "@/app/actions/post";

// import { CategoryWithCount } from "@/app/components/forum-card";

interface PostEditorProps {
  categories: CategoryWithCount[];
  onCancel?: () => void;
}

export function PostEditor({ categories, onCancel }: PostEditorProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockTicker, setStockTicker] = useState("");

  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!title.trim() || !categoryId) return;

    setError(null);

    startTransition(async () => {
      try {
        const post = await createPost({
          title,
          content,
          categoryId,
          stockTicker,
        });

        console.log("Post created:", post.id);

        setTitle("");
        setCategoryId("");
        setStockTicker("");

        setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });

        onCancel?.();
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to create post.",
        );
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* TOP — fixed within the flex layout */}
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

      {/* MIDDLE — takes all remaining space */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto hide-scrollbar">
        <div className="w-full min-w-0 max-w-full">
          <Tiptap content={content} onChange={setContent} />
        </div>
      </div>

      {/* BOTTOM */}
      <div className="shrink-0 flex items-center justify-end gap-2 pt-4">
        {error && <p className="mr-auto text-[13px] text-red-500">{error}</p>}

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
          disabled={isPending || !title.trim() || !categoryId}
          onClick={handleSubmit}
          className="text-[15px]"
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
