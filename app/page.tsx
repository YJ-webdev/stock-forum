import { getRecentPosts } from "./actions/posts";
import { PostCard } from "./components/post-card";
// import { LivePriceTracker } from "./components/live-price-tracker";

export default async function Home() {
  const posts = await getRecentPosts();

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="relative flex flex-col flex-1 w-full items-start bg-white dark:bg-black">
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        {/* <LivePriceTracker /> */}
      </main>
    </div>
  );
}
