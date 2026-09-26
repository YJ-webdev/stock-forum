import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import LayoutShell from "../components/layout-shell";

import { getMostLikedComments } from "../actions/post";
import { getPopularBoards } from "../actions/query";
import { getTopBetters } from "../actions/leaderboard";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const [user, mostLikedComments, popularBoards, traders] = await Promise.all([
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
    getMostLikedComments(5),
    getPopularBoards(7),
    getTopBetters(5),
  ]);

  return (
    <LayoutShell
      user={user}
      comments={mostLikedComments}
      popularBoards={popularBoards}
      traders={traders}
    >
      {children}
    </LayoutShell>
  );
}
