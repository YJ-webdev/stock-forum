"use client";

import Link from "next/link";

export interface PostWithRelations {
  id: string;
  title: string;
  content: string;
  stockTicker?: string | null;
  createdAt: Date;
  author: {
    name: string | null;
    image: string | null;
  };
  category: {
    name: string;
    slug: string;
  };
  _count: {
    comments: number;
    likes: number;
  };
}

export function PostCard({ post }: { post: PostWithRelations }) {
  return (
    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {post.author.name || "Anonymous"}
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
            {post.category.name}
          </span>
        </div>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      <Link href={`/posts/${post.id}`}>
        <h3 className="font-semibold text-base mb-1 hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {post.content}
        </p>
      </Link>

      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
        {post.stockTicker && (
          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
            ${post.stockTicker}
          </span>
        )}
        <span>💬 {post._count.comments} comments</span>
        <span>❤️ {post._count.likes} likes</span>
      </div>
    </div>
  );
}
