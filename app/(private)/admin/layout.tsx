// app/(private)/admin/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { auth } from "@/auth";
import { UserProvider } from "@/app/context/user-context";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { User } from "@/types/user";

export const metadata: Metadata = {
  title: "Admin Console",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

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

  const user: User = {
    ...session.user,
    ranking,
  };

  return (
    <UserProvider user={user}>
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        <header
          className="
            sticky top-0 z-40 flex min-h-14 flex-wrap
            items-center justify-between gap-3
            border-b bg-background px-4 py-3
            shadow-sm sm:px-6
          "
        >
          <div className="flex shrink-0 items-center gap-3">
            <div
              className="
                flex size-7 items-center justify-center rounded-lg
                bg-rose-500/10 text-rose-600 dark:text-rose-400
              "
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
            </div>

            <span className="text-sm font-bold tracking-tight">
              Admin Console
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
              Logged in as{" "}
              <strong className="text-foreground">{user.email}</strong>
            </span>

            <Link
              href="/"
              className="
                flex shrink-0 items-center gap-1
                text-xs text-muted-foreground
                transition-colors hover:text-foreground
              "
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
      </div>
    </UserProvider>
  );
}
