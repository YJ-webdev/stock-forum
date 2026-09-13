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
  lunchStartMs?: number;
  lunchEndMs?: number;
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
  pollingInterval = 0,
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
        listener,
      );
    },
    [symbol, name, range, displaySymbol, assetType, pollingInterval],
  );

  const getSnapshot = useCallback(() => {
    if (!symbol) {
      return EMPTY_SNAPSHOT;
    }

    return getMarketQuoteSnapshot(symbol, range);
  }, [symbol, range]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const EMPTY_SNAPSHOT = {
  data: null,
  loading: false,
};
