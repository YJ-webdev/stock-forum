// app/api/cron/news/route.ts
import { NextResponse } from "next/server";

import { syncMarketNews } from "@/app/actions/news";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEWS_RETENTION_DAYS = 4;
const NEWS_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 3;

// Add or remove symbols to fit your actual MarketAsset seed data and API quota.
// Missing symbols are automatically skipped.
const MARKET_GROUPS = [
  {
    region: "America",
    symbols: ["^GSPC", "^NDX", "^DJI", "^GSPTSE", "^MXX"],
  },
  {
    region: "Europe",
    symbols: ["^GDAXI", "^FTSE", "^FCHI", "^STOXX50E"],
  },
  {
    region: "Asia",
    symbols: ["^N225", "^KS11", "^HSI", "^NSEI"],
  },
  {
    region: "Middle_East",
    symbols: ["^TASI"],
  },
  {
    region: "Africa",
    symbols: ["^J203"],
  },
  {
    region: "Global",
    symbols: ["EURUSD=X", "JPY=X", "GC=F", "CL=F", "BTC-USD", "ETH-USD"],
  },
] as const;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    const cutoff = new Date(now - NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Remove expired articles; this does not reset the API collection interval.
    const deleted = await prisma.marketNews.deleteMany({
      where: { publishedAt: { lt: cutoff } },
    });

    const symbols = [
      ...new Set(MARKET_GROUPS.flatMap((group) => group.symbols)),
    ];
    const markets = await prisma.marketAsset.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true, newsLastFetchedAt: true },
    });

    const marketBySymbol = new Map(
      markets.map((market) => [market.symbol, market]),
    );
    const eligible = symbols.filter((symbol) => {
      const market = marketBySymbol.get(symbol);
      if (!market) return false;
      if (!market.newsLastFetchedAt) return true;
      return (
        now - new Date(market.newsLastFetchedAt).getTime() >=
        NEWS_SYNC_INTERVAL_MS
      );
    });

    const results: Array<{ symbol: string; saved: number; error?: string }> =
      [];

    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map((symbol) => syncMarketNews(symbol)),
      );

      settled.forEach((result, index) => {
        const symbol = batch[index];
        if (result.status === "fulfilled") {
          results.push({ symbol, saved: result.value.length });
        } else {
          console.error(`News cron failed for ${symbol}:`, result.reason);
          results.push({ symbol, saved: 0, error: "Sync failed" });
        }
      });
    }

    return NextResponse.json({
      ok: true,
      retentionDays: NEWS_RETENTION_DAYS,
      deleted: deleted.count,
      configured: symbols.length,
      missing: symbols.filter((symbol) => !marketBySymbol.has(symbol)),
      skippedRecentlyFetched: markets.length - eligible.length,
      attempted: results.length,
      saved: results.reduce((total, result) => total + result.saved, 0),
      results,
    });
  } catch (error) {
    console.error("News cron failed:", error);
    return NextResponse.json({ error: "News cron failed." }, { status: 500 });
  }
}
