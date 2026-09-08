import { auth } from "@/auth";
import { getUserOpenPositions } from "@/app/actions/get-portfolio";

import { redirect } from "next/navigation";
import { PortfolioTable } from "@/app/components/portfolio-table";

export default async function PortfolioPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const positions = await getUserOpenPositions(session.user.id);

  return (
    <main className="container max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Trading Portfolio</h1>
      <PortfolioTable userId={session.user.id} positions={positions} />
    </main>
  );
}
