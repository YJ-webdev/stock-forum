import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

async function getMostViewedPost(limit = 5) {
  return prisma.post.findMany({
    take: limit,

    orderBy: {
      viewCount: "desc",
    },

    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      createdAt: true,

      asset: {
        select: {
          name: true,
          symbol: true,
          displaySymbol: true,
        },
      },

      author: {
        select: {
          name: true,
        },
      },
    },
  });
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
  const mostViewedPosts = await getMostViewedPost();

  return (
    <LayoutShell user={user} news={news} posts={mostViewedPosts}>
      {children}
    </LayoutShell>
  );
}
