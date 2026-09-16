import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Page() {
  const posts = await prisma.post.findMany({
    where: {
      assetSymbol: null,
    },

    include: {
      author: true,
      comments: true,
      likes: true,

      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/general/post/${post.slug}`}
            className="flex gap-4"
          >
            {/* Thumbnail */}
            {post.thumbnail && (
              <img
                src={post.thumbnail}
                alt={post.title ?? ""}
                className="aspect-3/2 w-36 shrink-0 rounded-md object-cover"
              />
            )}

            {/* Post info */}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{post.title}</h2>

              <div className="mt-1 text-sm text-muted-foreground">
                {post.author.name}
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{post.createdAt.toLocaleDateString()}</span>

                <span>{post._count.comments} comments</span>

                <span>{post._count.likes} likes</span>

                <span>{post.viewCount} views</span>
              </div>
            </div>
          </Link>
        ))}

        {posts.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No posts yet.
          </div>
        )}
      </div>
    </div>
  );
}
