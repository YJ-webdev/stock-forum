import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

export interface MarketPriceUpdate {
  symbol: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: string;
  updatedAt: string;
}

const yahooFinance = new YahooFinance({
  queue: {
    concurrency: 2,
    interval: 200,
  },
});

// Map Database Symbol -> Yahoo Finance Ticker
const SYMBOL_MAP: Record<string, string> = {
  BTCUSD: "BTC-USD",
  US100: "^NDX",
  US500: "^GSPC",
  DJI: "^DJI",
};

// Reverse map for mapping Yahoo response back to UI symbols
const REVERSE_SYMBOL_MAP = Object.fromEntries(
  Object.entries(SYMBOL_MAP).map(([db, yahoo]) => [yahoo, db]),
);

let cachedData: MarketPriceUpdate[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 5000;
let activeFetchPromise: Promise<MarketPriceUpdate[]> | null = null;

function formatVolume(vol: number | undefined | null): string {
  if (!vol) return "N/A";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
}

async function getLatestPrices(): Promise<MarketPriceUpdate[]> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS && cachedData.length > 0) {
    return cachedData;
  }

  if (activeFetchPromise) return activeFetchPromise;

  activeFetchPromise = (async (): Promise<MarketPriceUpdate[]> => {
    try {
      // 1. Fetch registered database symbols
      const registeredAssets = await prisma.marketAsset.findMany({
        select: { symbol: true },
      });

      let dbSymbols = registeredAssets.map((asset) => asset.symbol);
      if (dbSymbols.length === 0) {
        dbSymbols = ["BTCUSD", "US100", "US500", "DJI"];
      }

      // 2. Map Database symbols to valid Yahoo Tickers
      const yahooSymbolMap = dbSymbols.map((s) => ({
        dbSymbol: s,
        yahooSymbol: SYMBOL_MAP[s] || s,
      }));

      // 3. Batch fetch quotes safely
      const rawQuotes = await Promise.all(
        yahooSymbolMap.map(({ yahooSymbol }) =>
          yahooFinance.quoteCombine(yahooSymbol).catch((err: Error) => {
            console.error(
              `[Yahoo Stream] Failed for ${yahooSymbol}:`,
              err.message,
            );
            return null;
          }),
        ),
      );

      // 4. Filter valid objects
      const validQuotes = rawQuotes.filter((q): q is NonNullable<typeof q> =>
        Boolean(q && typeof q === "object" && "symbol" in q && q.symbol),
      );

      // 5. Build response mapping Yahoo Ticker BACK to Database Symbol key
      const nowIso = new Date().toISOString();
      cachedData = validQuotes.map((quote) => {
        const clientSymbol = REVERSE_SYMBOL_MAP[quote.symbol] || quote.symbol;

        return {
          symbol: clientSymbol,
          lastPrice: quote.regularMarketPrice ?? 0,
          change: quote.regularMarketChange ?? 0,
          changePercent: quote.regularMarketChangePercent ?? 0,
          high: quote.regularMarketDayHigh ?? 0,
          low: quote.regularMarketDayLow ?? 0,
          volume: formatVolume(quote.regularMarketVolume),
          updatedAt: nowIso,
        };
      });

      // 6. Sync updated prices back to Prisma asynchronously
      Promise.all(
        cachedData.map((item) =>
          prisma.marketAsset.updateMany({
            where: { symbol: item.symbol },
            data: { lastPrice: item.lastPrice },
          }),
        ),
      ).catch((err) =>
        console.error(
          "[Database Sync Error] Failed to update asset prices:",
          err,
        ),
      );

      lastFetchTime = Date.now();
      return cachedData;
    } catch (error) {
      console.error("Error fetching market data:", error);
      return cachedData; // Fallback to last cache on fatal error
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const pushUpdates = async () => {
        if (req.signal.aborted) {
          cleanup();
          return;
        }

        try {
          const updates = await getLatestPrices();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(updates)}\n\n`),
          );
        } catch (err) {
          console.error("SSE Push Error:", err);
          cleanup();
        }
      };

      await pushUpdates();
      intervalId = setInterval(pushUpdates, 5000);
    },
    cancel() {
      cleanup();
    },
  });

  req.signal.addEventListener("abort", cleanup);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
