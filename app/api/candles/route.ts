// app/api/candles/route.ts
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();

interface YahooQuote {
  date: Date | string | number;
  close: number | null;
}

// 🟢 Map problematic index tickers to valid Yahoo tickers
const SYMBOL_MAPPINGS: Record<string, string> = {
  "000010.SYS": "DXJ", // Fallback TOPIX to WisdomTree Japan ETF
  US500: "SPY",
  US100: "QQQ",
  US30: "DIA",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawSymbol = searchParams.get("symbol") || "SPY";

  // Resolve mapped ticker symbol
  const symbol = SYMBOL_MAPPINGS[rawSymbol] || rawSymbol;

  try {
    const queryOptions = {
      period1: new Date(Date.now() - 30 * 60 * 60 * 1000), // Last 30 hours
      interval: "1m" as const,
      includePrePost: false,
    };

    const chartResult = await yahoo.chart(symbol, queryOptions);
    const rawQuotes = (chartResult as { quotes?: YahooQuote[] })?.quotes || [];
    const meta =
      (chartResult as { meta?: Record<string, unknown> })?.meta || {};

    if (rawQuotes.length === 0) {
      return NextResponse.json(
        {
          points: [],
          currentPrice: 0,
          changePercent: 0,
          isClosed: true,
        },
        {
          headers: {
            "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
          },
        },
      );
    }

    // const [chartResult, quoteResult] = await Promise.all([
    //   yahoo.chart(symbol, queryOptions),
    //   yahoo.quote(symbol),
    // ]);

    // const rawQuotes = (chartResult as { quotes?: YahooQuote[] })?.quotes || [];

    // if (rawQuotes.length === 0) {
    //   return NextResponse.json({
    //     points: [],
    //     currentPrice: 0,
    //     changePercent: 0,
    //     isClosed: true,
    //   });
    // }

    const validQuotes = rawQuotes.filter((q: YahooQuote) => q.close !== null);
    const regularSessionQuotes = validQuotes.slice(-390);

    const points = regularSessionQuotes.map((q: YahooQuote) => {
      const timeMs =
        q.date instanceof Date
          ? q.date.getTime()
          : typeof q.date === "number"
            ? q.date * (q.date < 1e11 ? 1000 : 1)
            : new Date(q.date).getTime();

      return {
        timestampMs: timeMs,
        price: Number(q.close?.toFixed(2)),
      };
    });

    //     // 🟢 Market states: "REGULAR" means open; "CLOSED", "PRE", "POST" mean regular hours are closed.
    //     const marketState = quoteResult.marketState || "CLOSED";
    //     const isClosed = marketState !== "REGULAR";

    //     return NextResponse.json({
    //       points,
    //       currentPrice:
    //         quoteResult.regularMarketPrice ?? points[points.length - 1]?.price ?? 0,
    //       changePercent: quoteResult.regularMarketChangePercent ?? 0,
    //       isClosed,
    //       marketState,
    //     });
    //   } catch (error) {
    //     console.error("Yahoo Finance Fetch Error:", error);
    //     return NextResponse.json(
    //       { points: [], currentPrice: 0, changePercent: 0, isClosed: true },
    //       { status: 500 },
    //     );
    //   }
    // }
    const currentPrice =
      (meta.regularMarketPrice as number) ??
      points[points.length - 1]?.price ??
      0;

    const previousClose = (meta.chartPreviousClose as number) ?? currentPrice;
    const changePercent =
      previousClose !== 0
        ? ((currentPrice - previousClose) / previousClose) * 100
        : 0;

    const marketState = (meta.tradingPeriod as string) || "CLOSED";
    const isClosed = meta.currentTradingPeriod
      ? false
      : marketState !== "REGULAR";

    return NextResponse.json({
      points,
      currentPrice,
      changePercent,
      isClosed,
    });
  } catch (error) {
    console.error(`Yahoo Finance Fetch Error [${symbol}]:`, error);

    // Return empty payload cleanly without throwing 500 error to client
    return NextResponse.json(
      { points: [], currentPrice: 0, changePercent: 0, isClosed: true },
      { status: 200 }, // Use status 200 so hook handles empty array gracefully
    );
  }
}
