import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LayoutShell from "./components/layout-shell";

export default async function Home() {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : null;

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
        <LayoutShell user={user} marketData={marketData} />
      </main>
    </div>
  );
}
