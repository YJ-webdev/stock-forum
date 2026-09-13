"use client";

import type {
  AssetType,
  ChartPoint,
  ChartRange,
  MarketItem,
} from "./useMarketQuote";

interface StoreEntry {
  data: MarketItem | null;
  loading: boolean;

  listeners: Set<() => void>;

  fetchPromise: Promise<void> | null;

  subscribers: number;
  pollingSubscribers: number;

  pollingInterval: ReturnType<typeof setInterval> | null;

  // IMPORTANT:
  // This object is only replaced when data/loading actually changes.
  // useSyncExternalStore needs a stable snapshot reference.
  snapshot: {
    data: MarketItem | null;
    loading: boolean;
  };
}

const store = new Map<string, StoreEntry>();

function getKey(symbol: string, range: ChartRange) {
  return `${symbol}::${range}`;
}

function getEntry(symbol: string, range: ChartRange): StoreEntry {
  const key = getKey(symbol, range);

  let entry = store.get(key);

  if (!entry) {
    entry = {
      data: null,
      loading: false,

      listeners: new Set(),

      fetchPromise: null,

      subscribers: 0,
      pollingSubscribers: 0,

      pollingInterval: null,

      snapshot: {
        data: null,
        loading: false,
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
) {
  const entry = getEntry(symbol, range);

  // If a request is already running, reuse it.
  if (entry.fetchPromise) {
    return entry.fetchPromise;
  }

  entry.fetchPromise = (async () => {
    entry.loading = true;
    updateSnapshot(entry);
    notify(entry);

    try {
      const res = await fetch(
        `/api/candles?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`,
      );

      if (!res.ok) {
        throw new Error("Fetch failed");
      }

      const json = await res.json();

      if (!json?.points?.length) {
        entry.data = null;

        updateSnapshot(entry);
        notify(entry);

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

      const formattedValue = currentPrice.toLocaleString("en-US", {
        style: assetType === "crypto" ? "currency" : "decimal",

        currency: assetType === "crypto" ? "USD" : undefined,

        minimumFractionDigits: assetType === "currency" ? 4 : 2,

        maximumFractionDigits: assetType === "currency" ? 4 : 2,
      });

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

        rawPrice: currentPrice,

        previousClose: json.previousClose,

        updatedAt: points[points.length - 1]?.timestampMs ?? Date.now(),

        exchangeTimezone: json.exchangeTimezone,
      };
    } catch (error) {
      console.error(`Market quote error for ${symbol}:`, error);

      entry.data = null;
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
) {
  const entry = getEntry(symbol, range);

  // Already polling.
  if (entry.pollingInterval) {
    return;
  }

  entry.pollingInterval = setInterval(() => {
    if (entry.pollingSubscribers <= 0) {
      return;
    }

    fetchQuote(symbol, name, range, displaySymbol, assetType);
  }, pollingInterval);
}

function stopPolling(symbol: string, range: ChartRange) {
  const entry = getEntry(symbol, range);

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
  listener: () => void,
) {
  const entry = getEntry(symbol, range);

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
    );
  }

  // Initial request.
  if (!entry.data && !entry.fetchPromise) {
    fetchQuote(symbol, name, range, displaySymbol, assetType);
  }

  return () => {
    entry.listeners.delete(listener);

    entry.subscribers--;

    if (pollingInterval > 0) {
      entry.pollingSubscribers--;

      if (entry.pollingSubscribers <= 0) {
        entry.pollingSubscribers = 0;

        stopPolling(symbol, range);
      }
    }
  };
}

export function getMarketQuoteSnapshot(symbol: string, range: ChartRange) {
  return getEntry(symbol, range).snapshot;
}

export async function refreshMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
) {
  return fetchQuote(symbol, name, range, displaySymbol, assetType);
}
