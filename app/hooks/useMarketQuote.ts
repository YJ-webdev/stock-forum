"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getMarketQuoteSnapshot,
  subscribeToMarketQuote,
} from "./market-quote-store";

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
  lunchStartMs?: number | null;
  lunchEndMs?: number | null;
}

export interface MarketQuoteSnapshot {
  data: MarketItem | null;
  loading: boolean;
  error: string | null;
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

export type ChartInterval =
  | "1m"
  | "2m"
  | "5m"
  | "15m"
  | "30m"
  | "60m"
  | "1d"
  | "1wk";

export type AssetType = "index" | "stock" | "crypto" | "currency" | "futures";

export type SelectedRange = "1D" | "5D" | "1M" | "3M" | "1Y" | "5Y" | "MAX";

const EMPTY_SNAPSHOT: MarketQuoteSnapshot = {
  data: null,
  loading: false,
  error: null,
};

export function useMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
  pollingInterval = 0,
  chartInterval?: ChartInterval,
) {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!symbol) {
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
    ],
  );
  const getSnapshot = useCallback((): MarketQuoteSnapshot => {
    if (!symbol) {
      return EMPTY_SNAPSHOT;
    }

    return getMarketQuoteSnapshot(symbol, range, chartInterval);
  }, [symbol, range, chartInterval]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
