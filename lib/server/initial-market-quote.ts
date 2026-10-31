import "server-only";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { getMarketCandles } from "@/lib/server/market-candles";
import {
  buildMarketQuote,
  type InitialMarketQuote,
} from "@/lib/utils/build-market-quote";

export async function getInitialMarketQuote(
  symbol: string,
): Promise<InitialMarketQuote | null> {
  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  try {
    const candles = await getMarketCandles(symbol, "1D", "1m");

    const data = buildMarketQuote({
      candles,
      symbol,
      name: market?.name ?? symbol,
      displaySymbol: market?.displaySymbol ?? symbol,
      assetType: market?.assetType ?? "index",
      range: "1D",
    });

    return {
      data,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error("Failed to load initial market quote:", {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });

    // Let the browser retry through /api/candles.
    return null;
  }
}
