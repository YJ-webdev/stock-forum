import { notFound } from "next/navigation";
import { getPostsByAsset } from "@/app/actions/forum-categories";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = await getPostsByAsset(slug);

  if (!posts) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b pb-4 mb-2">
        <h1 className="text-2xl font-bold">{slug}</h1>
      </div>

      {/* {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">
          No posts in this topic yet.
        </p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )} */}
    </div>
  );
}
