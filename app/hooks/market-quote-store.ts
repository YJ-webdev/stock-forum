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

interface Subscription {
  listener: () => void;
  pollingInterval: number;
}

interface StoreEntry {
  data: MarketItem | null;
  loading: boolean;
  error: string | null;

  subscriptions: Set<Subscription>;
  fetchPromise: Promise<void> | null;

  pollingTimer: number | null;
  pollingMs: number;

  lastSuccessAt: number;
  snapshot: MarketQuoteSnapshot;
}

const CACHE_FRESH_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;

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

      subscriptions: new Set(),
      fetchPromise: null,

      pollingTimer: null,
      pollingMs: 0,

      lastSuccessAt: 0,

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

function publish(entry: StoreEntry) {
  const previous = entry.snapshot;

  if (
    previous.data === entry.data &&
    previous.loading === entry.loading &&
    previous.error === entry.error
  ) {
    return;
  }

  entry.snapshot = {
    data: entry.data,
    loading: entry.loading,
    error: entry.error,
  };

  for (const subscription of entry.subscriptions) {
    subscription.listener();
  }
}

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFresh(entry: StoreEntry) {
  return (
    entry.data !== null && Date.now() - entry.lastSuccessAt < CACHE_FRESH_MS
  );
}

async function fetchQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
  chartInterval?: ChartInterval,
): Promise<void> {
  const entry = getEntry(symbol, range, chartInterval);

  if (entry.fetchPromise) {
    return entry.fetchPromise;
  }

  // Assign fetchPromise before notifying subscribers.
  const request = Promise.resolve().then(async () => {
    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    // Refresh existing data without showing the initial loading state.
    entry.loading = entry.data === null;
    entry.error = null;

    try {
      publish(entry);

      const params = new URLSearchParams({
        symbol,
        range,
      });

      if (chartInterval) {
        params.set("interval", chartInterval);
      }

      const response = await fetch(`/api/candles?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load market data (${response.status})`);
      }

      const json = await response.json();

      window.clearTimeout(timeout);

      const points: ChartPoint[] = Array.isArray(json?.points)
        ? json.points.filter(
            (point: ChartPoint) =>
              point &&
              isValidPrice(point.price) &&
              Number.isFinite(point.timestampMs),
          )
        : [];

      const lastPoint = points.at(-1);

      const currentPrice = isValidPrice(json?.currentPrice)
        ? json.currentPrice
        : lastPoint?.price;

      if (!isValidPrice(currentPrice)) {
        throw new Error("No market data available");
      }

      const previousClose = isValidPrice(json?.previousClose)
        ? json.previousClose
        : undefined;

      const basePrice =
        range === "1D"
          ? (previousClose ?? points[0]?.price ?? currentPrice)
          : (points[0]?.price ?? previousClose ?? currentPrice);

      const changeVal = currentPrice - basePrice;

      const percentVal =
        range === "1D" ? json?.dailyChangePercent : json?.rangeChangePercent;

      if (typeof percentVal !== "number" || !Number.isFinite(percentVal)) {
        throw new Error("Invalid percentage data received");
      }

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
        rawPrice: currentPrice,
        previousClose,

        isClosed: json.isClosed ?? true,
        marketOpenMs: json.marketOpenMs ?? null,
        marketCloseMs: json.marketCloseMs ?? null,

        updatedAt: json.updatedAt ?? lastPoint?.timestampMs ?? Date.now(),

        exchangeTimezone: json.exchangeTimezone,
        lunchStartMs: json.lunchStartMs ?? null,
        lunchEndMs: json.lunchEndMs ?? null,
      };

      entry.lastSuccessAt = Date.now();
      entry.error = null;
    } catch (error) {
      const message = controller.signal.aborted
        ? "Market data request timed out"
        : error instanceof Error
          ? error.message
          : "Failed to load market data";

      console.error(`Market quote error for ${symbol}:`, message);

      // Keep the last successful data when a refresh fails.
      entry.error = message;
    } finally {
      window.clearTimeout(timeout);

      entry.loading = false;
      entry.fetchPromise = null;

      publish(entry);
    }
  });

  entry.fetchPromise = request;

  return request;
}

function configurePolling(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string,
  assetType: AssetType,
  chartInterval?: ChartInterval,
) {
  const entry = getEntry(symbol, range, chartInterval);

  let nextPollingMs = Infinity;

  for (const subscription of entry.subscriptions) {
    if (
      Number.isFinite(subscription.pollingInterval) &&
      subscription.pollingInterval > 0
    ) {
      nextPollingMs = Math.min(nextPollingMs, subscription.pollingInterval);
    }
  }

  if (!Number.isFinite(nextPollingMs)) {
    nextPollingMs = 0;
  }

  if (entry.pollingMs === nextPollingMs) {
    return;
  }

  if (entry.pollingTimer !== null) {
    window.clearInterval(entry.pollingTimer);
    entry.pollingTimer = null;
  }

  entry.pollingMs = nextPollingMs;

  if (nextPollingMs === 0) {
    return;
  }

  entry.pollingTimer = window.setInterval(() => {
    if (
      document.hidden ||
      entry.subscriptions.size === 0 ||
      entry.fetchPromise
    ) {
      return;
    }

    // A recent mount or manual refresh already provided fresh data.
    if (Date.now() - entry.lastSuccessAt < entry.pollingMs) {
      return;
    }

    void fetchQuote(
      symbol,
      name,
      range,
      displaySymbol,
      assetType,
      chartInterval,
    );
  }, nextPollingMs);
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

  const subscription: Subscription = {
    listener,
    pollingInterval,
  };

  const isFirstSubscriber = entry.subscriptions.size === 0;

  entry.subscriptions.add(subscription);

  configurePolling(
    symbol,
    name,
    range,
    displaySymbol,
    assetType,
    chartInterval,
  );

  if (
    !entry.fetchPromise &&
    (!entry.data || (isFirstSubscriber && !isFresh(entry)))
  ) {
    void fetchQuote(
      symbol,
      name,
      range,
      displaySymbol,
      assetType,
      chartInterval,
    );
  }

  return () => {
    entry.subscriptions.delete(subscription);

    configurePolling(
      symbol,
      name,
      range,
      displaySymbol,
      assetType,
      chartInterval,
    );
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
