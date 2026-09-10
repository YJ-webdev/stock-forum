import { useEffect, useState } from "react";

export interface MarketItem {
  id: string;
  name: string;
  value: string;
  change: string;
  percent: string;
  isPositive: boolean;
  history: number[];
  isClosed: boolean;
}

export function useFinnhubQuote(symbol: string, name: string) {
  const [data, setData] = useState<MarketItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchQuote() {
      try {
        // 1. Safely encode ticker symbol to handle special characters (^, =, .)
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}`,
        );

        if (!res.ok) {
          if (isMounted) setData(null);
          return;
        }

        const json = await res.json();

        // 2. Validate candle points array
        if (!json || !Array.isArray(json.points) || json.points.length === 0) {
          if (isMounted) setData(null);
          return;
        }

        if (isMounted) {
          // Extract history prices cleanly
          const historyPrices: number[] = json.points.map(
            (p: { price: number }) => p.price,
          );

          const currentPrice =
            json.currentPrice ?? historyPrices[historyPrices.length - 1];
          const firstPrice = historyPrices[0] ?? currentPrice;
          const changeVal = currentPrice - firstPrice;
          const percentVal =
            json.changePercent ??
            (firstPrice !== 0 ? (changeVal / firstPrice) * 100 : 0);

          // 3. Format value based on symbol type (USD vs Index points/FX)
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
            history: historyPrices,
            isClosed: json.isClosed ?? true,
          });
        }
      } catch (_err) {
        if (isMounted) setData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchQuote();

    const interval = setInterval(fetchQuote, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol, name]);

  return { data, loading };
}
