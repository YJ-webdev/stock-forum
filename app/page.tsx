import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LayoutShell from "./components/layout-shell";
import { getRecentPosts } from "./actions/posts";
import { PostCard } from "./components/post-card";
import { getForumCategories } from "./actions/categories";
// import { LivePriceTracker } from "./components/live-price-tracker";

async function getNews() {
  try {
    const res = await fetch("http://localhost:3000/api/news", {
      next: { revalidate: 300 }, // Cache news for 5 minutes
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Home() {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : null;

  const news = await getNews();
  const posts = await getRecentPosts();
  const categories = await getForumCategories();
  const rawMarketData = await prisma.marketAsset.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Convert Date objects to ISO strings for Client Component compatibility
  const marketData = rawMarketData.map((asset) => ({
    ...asset,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  }));

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="relative flex flex-col flex-1 w-full items-start bg-white dark:bg-black">
        <LayoutShell
          user={user}
          marketData={marketData}
          news={news}
          categories={categories}
        >
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {/* <LivePriceTracker /> */}
        </LayoutShell>
      </main>
    </div>
  );
}
