// app/api/candles/route.ts
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();

interface YahooQuote {
  date: Date | string | number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number | null;
}

// 🟢 Complete range configurations matching your frontend selector
const RANGE_CONFIGS: Record<
  string,
  { period1: Date; interval: "1m" | "5m" | "15m" | "1d" | "1wk" }
> = {
  "1D": { period1: new Date(Date.now() - 24 * 60 * 60 * 1000), interval: "1m" },
  "5D": {
    period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    interval: "15m",
  },
  "1M": {
    period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    interval: "1d",
  },
  "6M": {
    period1: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    interval: "1d",
  },
  YTD: {
    period1: new Date(new Date().getFullYear(), 0, 1),
    interval: "1d",
  },
  "1Y": {
    period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    interval: "1d",
  },
  "5Y": {
    period1: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
    interval: "1wk",
  },
  MAX: { period1: new Date(0), interval: "1wk" },
};

const SYMBOL_MAPPINGS: Record<string, string> = {
  "000010.SYS": "DXJ", // Fallback TOPIX to WisdomTree Japan ETF
  US500: "SPY",
  US100: "QQQ",
  US30: "DIA",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawSymbol = searchParams.get("symbol") || "SPY";
  const symbol = SYMBOL_MAPPINGS[rawSymbol] || rawSymbol;
  const range = searchParams.get("range") || "1D";

  // Get config or fallback to 1D
  const config = RANGE_CONFIGS[range] || RANGE_CONFIGS["1D"];

  try {
    const chartResult = await yahoo.chart(symbol, {
      period1: config.period1,
      interval: config.interval,
      includePrePost: false,
    });

    const rawQuotes = (chartResult as { quotes?: YahooQuote[] })?.quotes || [];
    const meta =
      (chartResult as { meta?: Record<string, unknown> })?.meta || {};

    if (rawQuotes.length === 0) {
      return NextResponse.json(
        { points: [], currentPrice: 0, changePercent: 0, isClosed: true },
        {
          headers: {
            "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
          },
        },
      );
    }

    // Filter valid quotes
    const validQuotes = rawQuotes.filter((q) => q.close !== null);

    // Limit 1D intraday view to market hours (~390 mins)
    const targetQuotes = range === "1D" ? validQuotes.slice(-390) : validQuotes;

    // 🟢 Extract Full OHLC for Candle and Bar Charts
    const points = targetQuotes.map((q) => {
      const timeMs =
        q.date instanceof Date
          ? q.date.getTime()
          : typeof q.date === "number"
            ? q.date * (q.date < 1e11 ? 1000 : 1)
            : new Date(q.date).getTime();

      const close = Number(q.close?.toFixed(2));
      const open = q.open != null ? Number(q.open.toFixed(2)) : close;
      const high =
        q.high != null ? Number(q.high.toFixed(2)) : Math.max(open, close);
      const low =
        q.low != null ? Number(q.low.toFixed(2)) : Math.min(open, close);

      return {
        timestampMs: timeMs,
        price: close,
        open,
        high,
        low,
        close,
      };
    });

    const currentPrice =
      (meta.regularMarketPrice as number) ??
      points[points.length - 1]?.price ??
      0;

    const previousClose = (meta.chartPreviousClose as number) ?? currentPrice;

    // Range percentage calculation
    const startPrice = points[0]?.price ?? previousClose;
    const changePercent =
      startPrice !== 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0;

    const marketState = (meta.tradingPeriod as string) || "CLOSED";
    const isClosed = meta.currentTradingPeriod
      ? false
      : marketState !== "REGULAR";

    return NextResponse.json({
      points,
      currentPrice,
      previousClose,
      changePercent,
      isClosed,
    });
  } catch (error) {
    console.error(`Yahoo Finance Fetch Error [${symbol}]:`, error);
    return NextResponse.json(
      { points: [], currentPrice: 0, changePercent: 0, isClosed: true },
      { status: 200 },
    );
  }
}
