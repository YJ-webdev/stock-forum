import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import LayoutShell from "../components/layout-shell";

import { getMostLikedComments } from "../actions/post";
import { getPopularBoards } from "../actions/query";
import { getTopBetters } from "../actions/leaderboard";

async function getNews() {
  try {
    const res = await fetch("http://localhost:3000/api/news", {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return [];
    }

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

  const [user, news, mostLikedComments, popularBoards, traders] =
    await Promise.all([
      session?.user?.id
        ? prisma.user.findUnique({
            where: {
              id: session.user.id,
            },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              status: true,
              nationality: true,
              language: true,
            },
          })
        : null,

      getNews(),
      getMostLikedComments(5),
      getPopularBoards(7),
      getTopBetters(5),
    ]);

  return (
    <LayoutShell
      user={user}
      news={news}
      comments={mostLikedComments}
      popularBoards={popularBoards}
      traders={traders}
    >
      {children}
    </LayoutShell>
  );
}
