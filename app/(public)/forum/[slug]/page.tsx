import { PostCard } from "@/app/components/post-card";
import { notFound } from "next/navigation";
import { getForumCategories } from "@/app/actions/categories";
import { getForumPosts } from "@/app/actions/posts";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await getForumCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    notFound();
  }

  const posts = await getForumPosts(slug);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b pb-4 mb-2">
        <h1 className="text-2xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-sm text-muted-foreground">
            {category.description}
          </p>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">
          No posts in this topic yet.
        </p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
