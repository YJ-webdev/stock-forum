"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  getMarketQuoteSnapshot,
  subscribeToMarketQuote,
} from "./market-quote-store";

import type { InitialMarketQuote } from "@/lib/utils/build-market-quote";

export type AssetType = "index" | "stock" | "crypto" | "currency" | "commodity";

export type ChartRange =
  | "1D"
  | "5D"
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "5Y"
  | "MAX";

export type SelectedRange = ChartRange;

export type ChartInterval =
  | "1m"
  | "2m"
  | "5m"
  | "15m"
  | "30m"
  | "60m"
  | "90m"
  | "1h"
  | "1d"
  | "5d"
  | "1wk"
  | "1mo"
  | "3mo";

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
  displaySymbol?: string;

  value: string;
  change: string;
  percent: string;

  isPositive: boolean;

  history: ChartPoint[];

  rawPrice: number;
  previousClose?: number;

  updatedAt?: number | string;

  exchangeTimezone?: string;

  // Runtime market-session state returned by /api/candles
  isClosed: boolean;

  marketOpenMs?: number | null;
  marketCloseMs?: number | null;

  // Runtime intraday break detected from candle data
  lunchStartMs?: number | null;
  lunchEndMs?: number | null;
}

export function useMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange = "1D",
  displaySymbol: string = symbol,
  assetType: AssetType = "index",
  pollingInterval = 60_000,
  chartInterval?: ChartInterval,
  enabled = true,
  initialQuote?: InitialMarketQuote | null,
) {
  const usableInitialQuote =
    initialQuote?.data.id === symbol ? initialQuote : null;

  // A stable snapshot shared by SSR and hydration.
  const initialSnapshot = useMemo(
    () => ({
      data: usableInitialQuote?.data ?? null,
      loading: false,
      error: null,
    }),
    [usableInitialQuote],
  );

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!enabled) {
        return () => {};
      }

      return subscribeToMarketQuote(
        symbol,
        name,
        range,
        displaySymbol,
        assetType,
        pollingInterval,
        chartInterval,
        listener,
        usableInitialQuote,
      );
    },
    [
      symbol,
      name,
      range,
      displaySymbol,
      assetType,
      pollingInterval,
      chartInterval,
      enabled,
      usableInitialQuote,
    ],
  );

  const getSnapshot = useCallback(() => {
    const snapshot = getMarketQuoteSnapshot(symbol, range, chartInterval);

    // Display server data until the subscription seeds the browser store.
    if (
      snapshot.data === null &&
      snapshot.error === null &&
      usableInitialQuote
    ) {
      return initialSnapshot;
    }

    return snapshot;
  }, [symbol, range, chartInterval, usableInitialQuote, initialSnapshot]);

  const getServerSnapshot = useCallback(
    () => initialSnapshot,
    [initialSnapshot],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
