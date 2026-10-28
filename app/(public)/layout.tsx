import type { ReactNode } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@/types/user";

import LayoutShell from "../components/layout-shell";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  let user: User | null = null;

  if (session?.user?.id) {
    const ranking = await prisma.userRanking.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        tier: true,
        rank: true,
        netProfit: true,
        settledCount: true,
        wonCount: true,
        lostCount: true,
      },
    });

    user = {
      ...session.user,
      ranking,
    };
  }

  return <LayoutShell user={user}>{children}</LayoutShell>;
}
