import { getAiBriefMarkets } from "@/app/actions/ai-market-brief";

import { AiBriefTest } from "./_components/ai-brief-test";
import { AiBriefMarketManager } from "@/app/components/ai-brief-market-manager";

export default async function AdminPage() {
  const markets = await getAiBriefMarkets();

  return (
    <main className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          AI Market Brief
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Select which markets should be monitored for AI-generated market
          briefs.
        </p>
      </div>

      <div className="space-y-6">
        <AiBriefMarketManager markets={markets} />

        <AiBriefTest />
      </div>
    </main>
  );
}
