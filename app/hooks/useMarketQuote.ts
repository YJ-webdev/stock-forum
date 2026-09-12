"use client";

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
  displaySymbol?: string;
  previousClose?: number;
  updatedAt?: number | string;
  exchangeTimezone?: string;
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

export type AssetType = "index" | "stock" | "crypto" | "currency" | "futures";

export function useMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
) {
  const [data, setData] = useState<MarketItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!symbol) return;

    let isMounted = true;

    async function fetchQuote() {
      // Move state update inside async function
      if (isMounted) setLoading(true);

      try {
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`,
        );

        if (!res.ok) throw new Error("Fetch failed");

        const json = await res.json();
        if (!json?.points?.length) {
          if (isMounted) setData(null);
          return;
        }

        if (isMounted) {
          const points = json.points;
          const currentPrice =
            json.currentPrice ?? points[points.length - 1]?.price ?? 0;
          const basePrice =
            range === "1D"
              ? (json.previousClose ?? points[0]?.price)
              : points[0]?.price;
          const changeVal = currentPrice - basePrice;

          const percentVal =
            range === "1D" ? json.dailyChangePercent : json.rangeChangePercent;

          const formattedValue = currentPrice.toLocaleString("en-US", {
            style: assetType === "crypto" ? "currency" : "decimal",
            currency: assetType === "crypto" ? "USD" : undefined,
            minimumFractionDigits: assetType === "currency" ? 4 : 2,
            maximumFractionDigits: assetType === "currency" ? 4 : 2,
          });

          setData({
            id: symbol,
            name,
            displaySymbol,
            value: formattedValue,
            change: `${changeVal >= 0 ? "+" : ""}${changeVal.toFixed(2)}`,
            percent: `${percentVal >= 0 ? "+" : ""}${percentVal.toFixed(2)}%`,
            isPositive: percentVal >= 0,
            history: points,
            isClosed: json.isClosed ?? true,
            rawPrice: currentPrice,
            previousClose: json.previousClose,
            updatedAt: points[points.length - 1]?.timestampMs ?? Date.now(),
          });
        }
      } catch (_err) {
        if (isMounted) setData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchQuote();

    const interval = range === "1D" ? setInterval(fetchQuote, 60000) : null;

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [symbol, name, range, displaySymbol, assetType]);

  if (!symbol) {
    return { data: null, loading: false };
  }

  return { data, loading };
}
