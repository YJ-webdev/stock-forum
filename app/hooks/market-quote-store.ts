"use client";

import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "@/lib/data/market-symbols";
import {
  buildMarketQuote,
  type InitialMarketQuote,
  type MarketCandlesData,
} from "@/lib/utils/build-market-quote";

import type {
  AssetType,
  ChartInterval,
  ChartRange,
  MarketItem,
} from "./useMarketQuote";

interface MarketQuoteSnapshot {
  data: MarketItem | null;
  loading: boolean;
  error: string | null;
}

interface RequestConfig {
  symbol: string;
  name: string;
  range: ChartRange;
  displaySymbol: string | undefined;
  assetType: AssetType;
  chartInterval?: ChartInterval;
}

interface Subscription {
  listener: () => void;
  pollingInterval: number;
}

interface StoreEntry {
  snapshot: MarketQuoteSnapshot;
  subscriptions: Set<Subscription>;
  requestConfig: RequestConfig | null;
  fetchPromise: Promise<void> | null;
  pollingTimer: number | null;
  pollingMs: number;
  lastSuccessAt: number;
  lastSessionActive: boolean | null;
}

const CACHE_FRESH_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const RETURN_REFRESH_MIN_MS = 30_000;
const POST_CLOSE_GRACE_MS = 30 * 60_000;
const SCHEDULE_CHECK_MS = 60_000;

const store = new Map<string, StoreEntry>();

const marketBySymbol = new Map(
  ALL_MARKET_SYMBOLS.flatMap((market) => {
    const symbols = [market.symbol, market.providerSymbol].filter(
      (value): value is string => Boolean(value),
    );

    return symbols.map((symbol) => [symbol, market] as const);
  }),
);

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(timezone: string) {
  let formatter = timeFormatters.get(timezone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    timeFormatters.set(timezone, formatter);
  }

  return formatter;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getMarketSessionActive(
  config: RequestConfig,
  nowMs = Date.now(),
): boolean {
  const market = marketBySymbol.get(config.symbol);

  // Crypto, forex, commodities and unknown symbols retain
  // their existing polling behavior until their own
  // exchange calendars are implemented.
  if (!market?.marketSchedule) {
    return true;
  }

  const hours = TRADING_HOURS[market.marketSchedule];

  if (!hours) {
    return true;
  }

  const parts = getTimeFormatter(hours.timezone).formatToParts(new Date(nowMs));

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekday = getPart("weekday");
  const hour = Number(getPart("hour"));
  const minute = Number(getPart("minute"));

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return true;
  }

  const currentMinutes = hour * 60 + minute;
  const openMinutes = toMinutes(hours.open);
  const closeMinutes = toMinutes(hours.close);

  // Regular Monday-Friday equity sessions.
  // Exchange holidays and special sessions require
  // a separate calendar.
  if (weekday === "Sat" || weekday === "Sun") {
    return false;
  }

  const graceMinutes = POST_CLOSE_GRACE_MS / 60_000;

  return (
    currentMinutes >= openMinutes &&
    currentMinutes <= closeMinutes + graceMinutes
  );
}

function getKey(
  symbol: string,
  range: ChartRange,
  chartInterval?: ChartInterval,
): string {
  return `${symbol}::${range}::${chartInterval ?? "default"}`;
}

function getEntry(
  symbol: string,
  range: ChartRange,
  chartInterval?: ChartInterval,
): StoreEntry {
  const key = getKey(symbol, range, chartInterval);
  const existing = store.get(key);

  if (existing) return existing;

  const entry: StoreEntry = {
    snapshot: {
      data: null,
      loading: false,
      error: null,
    },
    subscriptions: new Set(),
    requestConfig: null,
    fetchPromise: null,
    pollingTimer: null,
    pollingMs: 0,
    lastSuccessAt: 0,
    lastSessionActive: null,
  };

  store.set(key, entry);
  return entry;
}

function publish(entry: StoreEntry, next: MarketQuoteSnapshot): void {
  const previous = entry.snapshot;

  if (
    previous.data === next.data &&
    previous.loading === next.loading &&
    previous.error === next.error
  ) {
    return;
  }

  entry.snapshot = next;

  for (const subscription of entry.subscriptions) {
    subscription.listener();
  }
}

function isFresh(entry: StoreEntry, maxAgeMs = CACHE_FRESH_MS): boolean {
  return (
    entry.snapshot.data !== null && Date.now() - entry.lastSuccessAt < maxAgeMs
  );
}

async function fetchQuote(config: RequestConfig): Promise<void> {
  const { symbol, name, range, displaySymbol, assetType, chartInterval } =
    config;

  const entry = getEntry(symbol, range, chartInterval);

  if (entry.fetchPromise) {
    return entry.fetchPromise;
  }

  const request = Promise.resolve().then(async () => {
    const controller = new AbortController();

    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    publish(entry, {
      data: entry.snapshot.data,
      loading: entry.snapshot.data === null,
      error: null,
    });

    try {
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
        throw new Error(`Market data request failed (${response.status})`);
      }

      const candles = (await response.json()) as MarketCandlesData;

      const data = buildMarketQuote({
        candles,
        symbol,
        name,
        displaySymbol: displaySymbol ?? symbol,
        assetType,
        range,
      });

      entry.lastSuccessAt = Date.now();

      publish(entry, {
        data,
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = controller.signal.aborted
        ? "Market data request timed out"
        : error instanceof Error
          ? error.message
          : "Failed to load market data";

      console.error(`Failed to fetch market quote for ${symbol}:`, error);

      publish(entry, {
        data: entry.snapshot.data,
        loading: false,
        error: message,
      });
    } finally {
      window.clearTimeout(timeout);
      entry.fetchPromise = null;
    }
  });

  entry.fetchPromise = request;
  return request;
}

function canRefresh(): boolean {
  return !document.hidden && navigator.onLine;
}

function checkEntryForRefresh(entry: StoreEntry, minAgeMs: number): void {
  const config = entry.requestConfig;

  if (
    !config ||
    entry.subscriptions.size === 0 ||
    entry.pollingMs <= 0 ||
    entry.fetchPromise ||
    !canRefresh()
  ) {
    return;
  }

  const sessionActive = getMarketSessionActive(config);
  const wasSessionActive = entry.lastSessionActive;

  entry.lastSessionActive = sessionActive;

  if (!sessionActive) {
    return;
  }

  // Refresh immediately when transitioning from a closed
  // session into the next trading session.
  const sessionJustOpened = wasSessionActive === false;

  if (sessionJustOpened || !isFresh(entry, minAgeMs)) {
    void fetchQuote(config);
  }
}

function configurePolling(entry: StoreEntry): void {
  let nextPollingMs = Infinity;

  for (const subscription of entry.subscriptions) {
    const interval = subscription.pollingInterval;

    if (Number.isFinite(interval) && interval > 0) {
      nextPollingMs = Math.min(nextPollingMs, interval);
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

  // This timer checks the exchange schedule.
  // It does not make network requests while the market
  // is closed beyond its 30-minute grace period.
  entry.pollingTimer = window.setInterval(
    () => {
      checkEntryForRefresh(entry, nextPollingMs);
    },
    Math.min(nextPollingMs, SCHEDULE_CHECK_MS),
  );
}

function seedMarketQuote(
  symbol: string,
  range: ChartRange,
  chartInterval: ChartInterval | undefined,
  initialQuote?: InitialMarketQuote | null,
): void {
  if (
    !initialQuote ||
    initialQuote.data.id !== symbol ||
    !Number.isFinite(initialQuote.fetchedAt)
  ) {
    return;
  }

  const entry = getEntry(symbol, range, chartInterval);

  if (entry.snapshot.data !== null || entry.fetchPromise) {
    return;
  }

  entry.lastSuccessAt = initialQuote.fetchedAt;

  publish(entry, {
    data: initialQuote.data,
    loading: false,
    error: null,
  });
}

function refreshActiveQuotes(): void {
  if (!canRefresh()) return;

  for (const entry of store.values()) {
    checkEntryForRefresh(entry, RETURN_REFRESH_MIN_MS);
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    refreshActiveQuotes();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", refreshActiveQuotes);
  window.addEventListener("online", refreshActiveQuotes);

  document.addEventListener("visibilitychange", handleVisibilityChange);
}

export function subscribeToMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string | undefined,
  assetType: AssetType,
  pollingInterval: number,
  chartInterval: ChartInterval | undefined,
  listener: () => void,
  initialQuote?: InitialMarketQuote | null,
): () => void {
  seedMarketQuote(symbol, range, chartInterval, initialQuote);

  const entry = getEntry(symbol, range, chartInterval);

  const config: RequestConfig = {
    symbol,
    name,
    range,
    displaySymbol,
    assetType,
    chartInterval,
  };

  const subscription: Subscription = {
    listener,
    pollingInterval,
  };

  const isFirstSubscriber = entry.subscriptions.size === 0;

  entry.requestConfig = config;
  entry.subscriptions.add(subscription);

  if (isFirstSubscriber) {
    entry.lastSessionActive = getMarketSessionActive(config);
  }

  configurePolling(entry);

  // Initial page load and explicit range changes are
  // allowed even when the market is closed.
  if (
    !entry.fetchPromise &&
    (!entry.snapshot.data || (isFirstSubscriber && !isFresh(entry)))
  ) {
    void fetchQuote(config);
  }

  return () => {
    entry.subscriptions.delete(subscription);

    configurePolling(entry);

    if (entry.subscriptions.size === 0) {
      entry.requestConfig = null;
      entry.lastSessionActive = null;
    }
  };
}

export function getMarketQuoteSnapshot(
  symbol: string,
  range: ChartRange,
  chartInterval?: ChartInterval,
): MarketQuoteSnapshot {
  return getEntry(symbol, range, chartInterval).snapshot;
}

export async function refreshMarketQuote(
  symbol: string,
  name: string,
  range: ChartRange,
  displaySymbol: string | undefined,
  assetType: AssetType,
  chartInterval?: ChartInterval,
): Promise<MarketQuoteSnapshot> {
  // Explicit refreshes are permitted regardless
  // of the market's current trading status.
  await fetchQuote({
    symbol,
    name,
    range,
    displaySymbol,
    assetType,
    chartInterval,
  });

  return getMarketQuoteSnapshot(symbol, range, chartInterval);
}
