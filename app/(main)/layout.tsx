import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getForumCategories } from "../actions/forum-categories";
import LayoutShell from "../components/layout-shell";

async function getNews() {
  try {
    const res = await fetch("http://localhost:3000/api/news", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : null;

  const news = await getNews();
  const categories = await getForumCategories();
  const rawMarketData = await prisma.marketAsset.findMany({
    orderBy: { createdAt: "desc" },
  });

  const marketData = rawMarketData.map((asset) => ({
    ...asset,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  }));

  return (
    <LayoutShell
      user={user}
      news={news}
      categories={categories}
      marketData={marketData}
    >
      {children}
    </LayoutShell>
  );
}
