import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1. Unauthenticated users -> Redirect to login
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  // 2. Non-ADMIN users -> Redirect to home page
  if (session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Admin Topbar Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">
            Admin Console
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            Logged in as{" "}
            <strong className="text-foreground">{session.user.email}</strong>
          </span>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
