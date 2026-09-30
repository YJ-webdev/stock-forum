import { auth } from "@/auth";

import LayoutShell from "../components/layout-shell";
import { getLayoutSideData } from "../actions/query";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Start immediately, but DO NOT await.
  const sideDataPromise = getLayoutSideData();

  return (
    <LayoutShell user={session?.user ?? null} sideDataPromise={sideDataPromise}>
      {children}
    </LayoutShell>
  );
}
