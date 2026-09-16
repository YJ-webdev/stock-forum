"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import Tiptap from "./tiptap";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { createPost } from "@/app/actions/post";

interface PostEditorProps {
  isLoggedIn: boolean;
  nationality: string | null;
  setOnWrite: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PostEditor({
  nationality,
  isLoggedIn,
  setOnWrite,
}: PostEditorProps) {
  const searchParams = useSearchParams();

  const name = searchParams.get("name");
  const symbol = searchParams.get("symbol");

  const [title, setTitle] = useState("");

  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

  const [editorKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handlePost = () => {
    if (!isLoggedIn) {
      toast.error("You must be logged in to post.");
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    startTransition(async () => {
      try {
        const post = await createPost({
          title,
          content,
        });

        toast.success("Post published.");

        setTitle("");
        setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });

        console.log("Created post:", post);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create post.",
        );
      }
    });
  };

  return (
    <div className="mt-5 flex h-full min-h-0 w-full flex-col">
      {/* Title */}
      <div className="shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={200}
          className="
            w-full bg-transparent
          
            text-[40px] font-semibold
            text-zinc-900
            outline-none
            placeholder:text-zinc-400
            dark:text-zinc-200
            dark:placeholder:text-zinc-600
          "
        />
      </div>

      {/* Editor */}
      <div className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Tiptap
          key={editorKey}
          content={content}
          onChange={setContent}
          name={name || "..."}
        />
      </div>

      {/* Actions */}
      <div className="ml-auto mt-2 flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-[15px]"
          disabled={isPending}
          onClick={() => setOnWrite(false)}
        >
          Cancel
        </Button>

        <Button
          type="button"
          className="w-18 text-[15px]"
          disabled={isPending || !title.trim()}
          onClick={handlePost}
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
