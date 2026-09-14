"use client";

import type {
  AssetType,
  ChartInterval,
  ChartPoint,
  ChartRange,
  MarketItem,
} from "./useMarketQuote";

interface MarketQuoteSnapshot {
  data: MarketItem | null;
  loading: boolean;
  error: string | null;
}

interface StoreEntry {
  data: MarketItem | null;
  loading: boolean;
  error: string | null;

  listeners: Set<() => void>;

  fetchPromise: Promise<void> | null;

  subscribers: number;
  pollingSubscribers: number;

  pollingInterval: ReturnType<typeof setInterval> | null;

  /*
   * IMPORTANT:
   * This object is only replaced when data/loading/error changes.
   * useSyncExternalStore needs a stable snapshot reference.
   */
  snapshot: MarketQuoteSnapshot;
}

const store = new Map<string, StoreEntry>();

function getKey(
  symbol: string,
  range: ChartRange,
  chartInterval?: ChartInterval,
) {
  return `${symbol}::${range}::${chartInterval ?? "default"}`;
}

function getEntry(
  symbol: string,
  range: ChartRange,
  chartInterval?: ChartInterval,
): StoreEntry {
  const key = getKey(symbol, range, chartInterval);

  let entry = store.get(key);

  if (!entry) {
    entry = {
      data: null,
      loading: false,
      error: null,

      listeners: new Set(),

      fetchPromise: null,

      subscribers: 0,
      pollingSubscribers: 0,

      pollingInterval: null,

      snapshot: {
        data: null,
        loading: false,
        error: null,
      },
    };

    store.set(key, entry);
  }

  return entry;
}

function updateSnapshot(entry: StoreEntry) {
  entry.snapshot = {
    data: entry.data,
    loading: entry.loading,
    error: entry.error,
  };
}

function notify(entry: StoreEntry) {
  entry.listeners.forEach((listener) => {
    listener();
  });
}

async function fetchQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
  chartInterval?: ChartInterval,
) {
  const entry = getEntry(symbol, range, chartInterval);

  /*
   * Prevent duplicate requests for the same
   * symbol/range/interval.
   */
  if (entry.fetchPromise) {
    return entry.fetchPromise;
  }

  entry.fetchPromise = (async () => {
    entry.loading = true;
    entry.error = null;

    updateSnapshot(entry);
    notify(entry);

    try {
      const params = new URLSearchParams({
        symbol,
        range,
      });

      if (chartInterval) {
        params.set("interval", chartInterval);
      }

      const res = await fetch(`/api/candles?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`Failed to load market data (${res.status})`);
      }

      const json = await res.json();

      /*
       * Request succeeded, but Yahoo/API returned no usable
       * chart points.
       */
      if (!json?.points?.length) {
        entry.data = null;
        entry.error = "No market data available";
        return;
      }

      const points: ChartPoint[] = json.points;

      const currentPrice =
        json.currentPrice ?? points[points.length - 1]?.price ?? 0;

      const basePrice =
        range === "1D"
          ? (json.previousClose ?? points[0]?.price ?? 0)
          : (points[0]?.price ?? 0);

      const changeVal = currentPrice - basePrice;

      const percentVal =
        range === "1D" ? json.dailyChangePercent : json.rangeChangePercent;

      /*
       * Make sure percentVal is actually usable.
       */
      if (typeof percentVal !== "number" || !Number.isFinite(percentVal)) {
        throw new Error("Invalid percentage data received");
      }

      const formattedValue = currentPrice.toLocaleString("en-US", {
        style: assetType === "crypto" ? "currency" : "decimal",

        currency: assetType === "crypto" ? "USD" : undefined,

        minimumFractionDigits: assetType === "currency" ? 4 : 2,

        maximumFractionDigits: assetType === "currency" ? 4 : 2,
      });

      /*
       * Successful request.
       */
      entry.error = null;

      entry.data = {
        id: symbol,

        name,

        displaySymbol,

        value: formattedValue,

        change: `${changeVal >= 0 ? "+" : ""}${changeVal.toFixed(2)}`,

        percent: `${percentVal >= 0 ? "+" : ""}${percentVal.toFixed(2)}%`,

        isPositive: percentVal >= 0,

        history: points,

        isClosed: json.isClosed ?? true,

        marketOpenMs: json.marketOpenMs ?? null,

        marketCloseMs: json.marketCloseMs ?? null,

        rawPrice: currentPrice,

        previousClose: json.previousClose,

        updatedAt:
          json.updatedAt ??
          points[points.length - 1]?.timestampMs ??
          Date.now(),

        exchangeTimezone: json.exchangeTimezone,

        lunchStartMs: json.lunchStartMs ?? null,

        lunchEndMs: json.lunchEndMs ?? null,
      };
    } catch (error) {
      console.error(`Market quote error for ${symbol}:`, error);

      entry.data = null;

      entry.error =
        error instanceof Error ? error.message : "Failed to load market data";
    } finally {
      entry.loading = false;
      entry.fetchPromise = null;

      updateSnapshot(entry);
      notify(entry);
    }
  })();

  return entry.fetchPromise;
}

function startPolling(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
  pollingInterval: number,
  chartInterval?: ChartInterval,
) {
  const entry = getEntry(symbol, range, chartInterval);

  // Already polling.
  if (entry.pollingInterval) {
    return;
  }

  entry.pollingInterval = setInterval(() => {
    if (entry.pollingSubscribers <= 0) {
      return;
    }

    fetchQuote(symbol, name, range, displaySymbol, assetType, chartInterval);
  }, pollingInterval);
}

function stopPolling(
  symbol: string,
  range: ChartRange,
  chartInterval?: ChartInterval,
) {
  const entry = getEntry(symbol, range, chartInterval);

  if (entry.pollingInterval) {
    clearInterval(entry.pollingInterval);

    entry.pollingInterval = null;
  }
}

export function subscribeToMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
  pollingInterval: number,
  chartInterval: ChartInterval | undefined,
  listener: () => void,
) {
  const entry = getEntry(symbol, range, chartInterval);

  entry.listeners.add(listener);

  entry.subscribers++;

  if (pollingInterval > 0) {
    entry.pollingSubscribers++;

    startPolling(
      symbol,
      name,
      range,
      displaySymbol,
      assetType,
      pollingInterval,
      chartInterval,
    );
  }

  /*
   * Fetch only when this cache entry has no data
   * and isn't already fetching.
   */
  if (!entry.data && !entry.fetchPromise) {
    fetchQuote(symbol, name, range, displaySymbol, assetType, chartInterval);
  }

  return () => {
    entry.listeners.delete(listener);

    entry.subscribers--;

    if (pollingInterval > 0) {
      entry.pollingSubscribers--;

      if (entry.pollingSubscribers <= 0) {
        entry.pollingSubscribers = 0;

        stopPolling(symbol, range, chartInterval);
      }
    }
  };
}

export function getMarketQuoteSnapshot(
  symbol: string,
  range: ChartRange,
  chartInterval?: ChartInterval,
) {
  return getEntry(symbol, range, chartInterval).snapshot;
}

export async function refreshMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
  chartInterval?: ChartInterval,
) {
  await fetchQuote(
    symbol,
    name,
    range,
    displaySymbol,
    assetType,
    chartInterval,
  );

  return getEntry(symbol, range, chartInterval).snapshot;
}
