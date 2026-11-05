"use client";

import { useEffect, useState } from "react";

import {
  buildMarketQuote,
  type InitialMarketQuote,
  type MarketCandlesData,
} from "@/lib/utils/build-market-quote";

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
  isClosed: boolean;
  marketOpenMs?: number | null;
  marketCloseMs?: number | null;
  lunchStartMs?: number | null;
  lunchEndMs?: number | null;
}

interface QuoteState {
  data: MarketItem | null;
  loading: boolean;
  error: string | null;
}

function getRefreshInterval(range: ChartRange, requestedInterval: number) {
  const defaultInterval = range === "1D" || range === "5D" ? 60_000 : 300_000;

  return requestedInterval > 0 ? requestedInterval : defaultInterval;
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
  const [state, setState] = useState<QuoteState>(() => ({
    data: initialQuote?.data.id === symbol ? initialQuote.data : null,
    loading: false,
    error: null,
  }));

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let controller: AbortController | null = null;
    let requestVersion = 0;

    const interval = getRefreshInterval(range, pollingInterval);

    async function refresh() {
      if (disposed || document.hidden || !navigator.onLine) {
        return;
      }

      // Cancel any older request for this chart.
      controller?.abort();

      const currentController = new AbortController();
      controller = currentController;

      const version = ++requestVersion;

      setState((previous) => ({
        ...previous,
        loading: previous.data === null,
        error: null,
      }));

      try {
        const params = new URLSearchParams({
          symbol,
          range,
        });

        if (chartInterval) {
          params.set("interval", chartInterval);
        }

        const response = await fetch(`/api/candles?${params.toString()}`, {
          cache: "no-store",
          signal: currentController.signal,
        });

        if (!response.ok) {
          throw new Error(`Market request failed (${response.status})`);
        }

        const candles = (await response.json()) as MarketCandlesData;

        const nextData = buildMarketQuote({
          candles,
          symbol,
          name,
          displaySymbol,
          assetType,
          range,
        });

        if (disposed || version !== requestVersion) {
          return;
        }

        setState({
          data: nextData,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (
          disposed ||
          currentController.signal.aborted ||
          version !== requestVersion
        ) {
          return;
        }

        setState((previous) => ({
          ...previous,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load market data",
        }));
      } finally {
        if (controller === currentController) {
          controller = null;
        }
      }
    }

    function handleReturn() {
      if (!document.hidden) {
        void refresh();
      }
    }

    // Fetch immediately when the chart is mounted
    // or when its symbol/range changes.
    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, interval);

    document.addEventListener("visibilitychange", handleReturn);

    window.addEventListener("online", handleReturn);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);

      document.removeEventListener("visibilitychange", handleReturn);

      window.removeEventListener("online", handleReturn);
    };
  }, [
    symbol,
    name,
    range,
    displaySymbol,
    assetType,
    pollingInterval,
    chartInterval,
    enabled,
  ]);

  return state;
}
