//SSE endpoint streaming Finnhub data
import { prisma } from "@/lib/prisma";
import { fetchFinnhubQuote } from "@/lib/finnhub";

export const dynamic = "force-dynamic";

const SYMBOL_MAP: Record<string, string> = {
  BTCUSD: "BINANCE:BTCUSDT",
  US100: "QQQ",
  US500: "SPY",
  DJI: "DIA",
};

export async function getLatestPrices() {
  const assets = await prisma.marketAsset.findMany({
    select: { symbol: true },
  });
  const symbols = assets.length
    ? assets.map((a) => a.symbol)
    : ["BTCUSD", "US100", "US500", "DJI"];

  const updates = await Promise.all(
    symbols.map(async (dbSymbol) => {
      const finnhubSymbol = SYMBOL_MAP[dbSymbol] || dbSymbol;
      const quote = await fetchFinnhubQuote(finnhubSymbol);

      return {
        symbol: dbSymbol,
        lastPrice: quote?.c ?? 0,
        change: quote?.d ?? 0,
        changePercent: quote?.dp ?? 0,
        high: quote?.h ?? 0,
        low: quote?.l ?? 0,
        updatedAt: new Date().toISOString(),
      };
    }),
  );

  return updates;
}
