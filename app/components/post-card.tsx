"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, MessageSquare } from "lucide-react";
import { DUMMY_POSTS, PostItem } from "../data/dummy";

function PostCard({ post }: { post: PostItem }) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevents navigating to post link when clicking save
    e.stopPropagation();
    setIsSaved((prev) => !prev);
  };

  return (
    <article className="group relative p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all duration-200 flex flex-col gap-3">
      {/* Header: Author Info + Topic Tag + Save Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Author Avatar */}
          {/* <img
            src={post.author.avatar}
            alt={post.author.name}
            className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 object-cover shrink-0"
          /> */}

          {/* Author Name & Topic Badge */}
          <div className="flex items-center gap-2 truncate text-xs">
            <span className="font-medium text-foreground truncate">
              {post.author.name}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-[11px] shrink-0">
              {post.topic}
            </span>
          </div>
        </div>

        {/* Save / Read Later Button */}
        <button
          onClick={handleSaveToggle}
          title={isSaved ? "Saved for later" : "Save for later"}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <Bookmark
            className={`h-4 w-4 transition-colors ${
              isSaved
                ? "fill-primary text-primary"
                : "text-muted-foreground group-hover:text-foreground"
            }`}
          />
        </button>
      </div>

      {/* Main Content Title */}
      <Link href={post.href} className="block">
        <h3 className="font-medium text-sm md:text-base leading-snug text-foreground group-hover:text-primary transition-colors">
          {post.title}
        </h3>
      </Link>

      {/* Footer Meta: Comments & Time Ago */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{post.commentsCount} comments</span>
        </div>
        <span>{post.timeAgo}</span>
      </div>
    </article>
  );
}

export function PostList() {
  return (
    <div className="flex flex-col gap-3">
      {DUMMY_POSTS.slice(0, 2).map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
