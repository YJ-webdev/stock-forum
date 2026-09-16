// app/post/[slug]/page.tsx

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostContent } from "@/app/components/post-content";
import type { JSONContent } from "@tiptap/react";

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: {
      slug,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },

      asset: {
        select: {
          symbol: true,
          displaySymbol: true,
          name: true,
          category: true,
          assetType: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Asset / category */}
      <div className="mb-3 flex items-center gap-2 text-[13px] text-zinc-500 dark:text-zinc-400">
        <span>Published in {post.asset?.name ?? "General"}</span>

        {post.asset?.displaySymbol && (
          <>
            <span>·</span>
            <span>{post.asset.displaySymbol}</span>
          </>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-3xl">
        {post.title}
      </h1>

      {/* Author */}
      <div className="mt-4 flex items-center gap-3">
        {post.author.image ? (
          <img
            src={post.author.image}
            alt={post.author.name ?? ""}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-[13px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {(post.author.name?.[0] ?? "?").toUpperCase()}
          </div>
        )}

        <div>
          <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
            {post.author.name ?? "Anonymous"}
          </p>

          <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
            {post.createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="my-8 border-t border-zinc-200 dark:border-zinc-800" />

      {/* Post body */}
      <PostContent content={post.content as JSONContent} />
    </article>
  );
}
