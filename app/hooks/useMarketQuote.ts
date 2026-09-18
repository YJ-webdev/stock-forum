"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getMarketQuoteSnapshot,
  subscribeToMarketQuote,
} from "./market-quote-store";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type AssetType =
  | "index"
  | "stock"
  | "crypto"
  | "currency"
  | "commodities";

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

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange = "1D",
  displaySymbol: string = symbol,
  assetType: AssetType = "index",
  pollingInterval = 0,
  chartInterval?: ChartInterval,
) {
  /*
   * useSyncExternalStore expects the subscribe function itself
   * to remain stable between renders.
   */
  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeToMarketQuote(
        symbol,
        name,
        range,
        displaySymbol,
        assetType,
        pollingInterval,
        chartInterval,
        listener,
      ),
    [
      symbol,
      name,
      range,
      displaySymbol,
      assetType,
      pollingInterval,
      chartInterval,
    ],
  );

  /*
   * Snapshot must correspond to the exact same
   * symbol/range/chartInterval cache key.
   */
  const getSnapshot = useCallback(
    () => getMarketQuoteSnapshot(symbol, range, chartInterval),
    [symbol, range, chartInterval],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
