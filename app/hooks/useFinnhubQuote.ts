import { useEffect, useState } from "react";

export interface ChartPoint {
  timestampMs: number;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface MarketItem {
  id: string;
  name: string;
  value: string;
  change: string;
  percent: string;
  isPositive: boolean;
  history: ChartPoint[];
  isClosed: boolean;
  rawPrice: number;
  previousClose?: number;
}

export type ChartRange =
  | "1D"
  | "5D"
  | "1M"
  | "6M"
  | "YTD"
  | "1Y"
  | "5Y"
  | "MAX";

export function useFinnhubQuote(
  symbol: string,
  name: string,
  range: ChartRange = "1D",
) {
  const [data, setData] = useState<MarketItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    if (!symbol) return;

    async function fetchQuote() {
      // 🟢 Fix 1: Reset loading state when range/symbol switches
      if (isMounted) setLoading(true);

      try {
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`,
        );

        if (!res.ok) {
          if (isMounted) setData(null);
          return;
        }

        const json = await res.json();

        if (!json || !Array.isArray(json.points) || json.points.length === 0) {
          if (isMounted) setData(null);
          return;
        }

        if (isMounted) {
          const points: { timestampMs: number; price: number }[] = json.points;
          const currentPrice =
            json.currentPrice ?? points[points.length - 1]?.price ?? 0;

          // 🟢 Fix 2: Calculate change relative to selected range start for non-1D charts
          const firstPrice = points[0]?.price ?? currentPrice;
          const changeVal =
            range === "1D"
              ? currentPrice - firstPrice
              : currentPrice - firstPrice;

          const percentVal =
            typeof json.changePercent === "number" && json.changePercent !== 0
              ? json.changePercent
              : firstPrice !== 0
                ? (changeVal / firstPrice) * 100
                : 0;

          const isUsdSecurity =
            !symbol.startsWith("^") &&
            !symbol.includes("=X") &&
            !symbol.includes(".");

          const formattedValue = isUsdSecurity
            ? currentPrice.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })
            : currentPrice.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });

          setData({
            id: symbol,
            name,
            value: formattedValue,
            change:
              changeVal >= 0
                ? `+${changeVal.toFixed(2)}`
                : changeVal.toFixed(2),
            percent: `${percentVal >= 0 ? "+" : ""}${percentVal.toFixed(2)}%`,
            isPositive: percentVal >= 0,
            history: points,
            isClosed: json.isClosed ?? true,
            rawPrice: currentPrice,
            previousClose: json.previousClose ?? firstPrice,
          });
        }
      } catch (_err) {
        if (isMounted) setData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchQuote();

    // 🟢 Polling only during 1D mode to save server bandwidth
    const interval = range === "1D" ? setInterval(fetchQuote, 60000) : null;

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [symbol, name, range]);

  return { data, loading };
}
