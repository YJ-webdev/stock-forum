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

// --------------------------------------------------
// TYPES
// --------------------------------------------------

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

interface MarketSession {
  active: boolean;
  finalCheckDue: boolean;
  key: string | null;
}

interface StoreEntry {
  snapshot: MarketQuoteSnapshot;
  subscriptions: Set<Subscription>;

  requestConfig: RequestConfig | null;
  fetchPromise: Promise<boolean> | null;

  pollingTimer: number | null;
  pollingMs: number;

  lastSuccessAt: number;

  finalCandidateKey: string | null;
  finalCompletedKey: string | null;
  finalRetryAt: number;
}

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const CACHE_FRESH_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const RETURN_REFRESH_MIN_MS = 30_000;

const POST_CLOSE_GRACE_MINUTES = 30;
const SCHEDULE_CHECK_MS = 60_000;
const FINAL_RETRY_MS = 60_000;

// --------------------------------------------------
// STORE
// --------------------------------------------------

const store = new Map<string, StoreEntry>();

const marketBySymbol = new Map(
  ALL_MARKET_SYMBOLS.flatMap((market) =>
    [market.symbol, market.providerSymbol]
      .filter((value): value is string => Boolean(value))
      .map((symbol) => [symbol, market] as const),
  ),
);

const formatters = new Map<string, Intl.DateTimeFormat>();

// --------------------------------------------------
// TIME HELPERS
// --------------------------------------------------

function getFormatter(timezone: string) {
  const cached = formatters.get(timezone);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  formatters.set(timezone, formatter);

  return formatter;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

// --------------------------------------------------
// MARKET SESSION
// --------------------------------------------------

function getMarketSession(
  config: RequestConfig,
  nowMs = Date.now(),
): MarketSession {
  const fallback: MarketSession = {
    active: true,
    finalCheckDue: false,
    key: null,
  };

  const market = marketBySymbol.get(config.symbol);

  if (!market?.marketSchedule) {
    return fallback;
  }

  const schedule = TRADING_HOURS[market.marketSchedule];

  if (!schedule) {
    return fallback;
  }

  const parts = getFormatter(schedule.timezone).formatToParts(new Date(nowMs));

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  const hour = Number(part("hour"));
  const minute = Number(part("minute"));

  const open = toMinutes(schedule.open);
  const close = toMinutes(schedule.close);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(open) ||
    !Number.isFinite(close)
  ) {
    return fallback;
  }

  // Overnight schedules require separate handling.
  // Keep their existing polling behavior.
  if (close <= open) {
    return fallback;
  }

  const weekday = part("weekday");

  const isTradingDay = weekday !== "Sat" && weekday !== "Sun";

  const currentMinutes = hour * 60 + minute;
  const graceEnd = close + POST_CLOSE_GRACE_MINUTES;

  const key = [config.symbol, part("year"), part("month"), part("day")].join(
    ":",
  );

  return {
    active: isTradingDay && currentMinutes >= open && currentMinutes < graceEnd,

    finalCheckDue: isTradingDay && currentMinutes >= graceEnd,

    key,
  };
}

// --------------------------------------------------
// STORE HELPERS
// --------------------------------------------------

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

  const cached = store.get(key);

  if (cached) return cached;

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

    finalCandidateKey: null,
    finalCompletedKey: null,
    finalRetryAt: 0,
  };

  store.set(key, entry);

  return entry;
}

function publish(entry: StoreEntry, next: MarketQuoteSnapshot) {
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

function isFresh(entry: StoreEntry, maxAgeMs = CACHE_FRESH_MS) {
  return (
    entry.snapshot.data !== null && Date.now() - entry.lastSuccessAt < maxAgeMs
  );
}

// --------------------------------------------------
// FETCH
// --------------------------------------------------

function fetchQuote(config: RequestConfig): Promise<boolean> {
  const entry = getEntry(config.symbol, config.range, config.chartInterval);

  if (entry.fetchPromise) {
    return entry.fetchPromise;
  }

  const request = Promise.resolve().then(async () => {
    const controller = new AbortController();

    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    if (!entry.snapshot.data) {
      publish(entry, {
        ...entry.snapshot,
        loading: true,
        error: null,
      });
    }

    try {
      const params = new URLSearchParams({
        symbol: config.symbol,
        range: config.range,
      });

      if (config.chartInterval) {
        params.set("interval", config.chartInterval);
      }

      const response = await fetch(`/api/candles?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load market candles (${response.status})`);
      }

      const candles = (await response.json()) as MarketCandlesData;

      const data = buildMarketQuote({
        candles,
        symbol: config.symbol,
        name: config.name,
        displaySymbol: config.displaySymbol ?? config.symbol,
        assetType: config.assetType,
        range: config.range,
      });

      entry.lastSuccessAt = Date.now();

      publish(entry, {
        data,
        loading: false,
        error: null,
      });

      return true;
    } catch (error) {
      publish(entry, {
        data: entry.snapshot.data,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load market quote",
      });

      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  });

  entry.fetchPromise = request;

  void request.then(() => {
    if (entry.fetchPromise === request) {
      entry.fetchPromise = null;
    }
  });

  return request;
}

// --------------------------------------------------
// REFRESH CONDITIONS
// --------------------------------------------------

function canRefresh() {
  return (
    typeof document !== "undefined" &&
    typeof navigator !== "undefined" &&
    !document.hidden &&
    navigator.onLine
  );
}

async function performFinalRefresh(
  entry: StoreEntry,
  config: RequestConfig,
  sessionKey: string,
) {
  if (
    entry.finalCompletedKey === sessionKey ||
    entry.fetchPromise ||
    Date.now() < entry.finalRetryAt
  ) {
    return;
  }

  // Reserve the retry window before starting the request.
  // This also prevents duplicate final-refresh attempts.
  entry.finalRetryAt = Date.now() + FINAL_RETRY_MS;

  const success = await fetchQuote(config);

  if (success) {
    entry.finalCompletedKey = sessionKey;
    entry.finalRetryAt = 0;
  } else {
    entry.finalRetryAt = Date.now() + FINAL_RETRY_MS;
  }
}

function checkEntryForRefresh(entry: StoreEntry, minAgeMs: number) {
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

  const session = getMarketSession(config);

  // --------------------------------------------------
  // ACTIVE SESSION
  // --------------------------------------------------

  if (session.active) {
    if (session.key !== null) {
      entry.finalCandidateKey = session.key;
    }

    if (!isFresh(entry, minAgeMs)) {
      void fetchQuote(config);
    }

    return;
  }

  // --------------------------------------------------
  // FINAL POST-CLOSE CHECK
  // --------------------------------------------------

  if (
    session.finalCheckDue &&
    session.key !== null &&
    entry.finalCandidateKey === session.key &&
    entry.finalCompletedKey !== session.key
  ) {
    void performFinalRefresh(entry, config, session.key);
  }

  // Otherwise the market is closed.
  // No network request is made.
}

// --------------------------------------------------
// POLLING
// --------------------------------------------------

function configurePolling(entry: StoreEntry) {
  let nextInterval = 0;

  for (const subscription of entry.subscriptions) {
    const interval = subscription.pollingInterval;

    if (!Number.isFinite(interval) || interval <= 0) {
      continue;
    }

    if (nextInterval === 0 || interval < nextInterval) {
      nextInterval = interval;
    }
  }

  if (entry.pollingMs === nextInterval) {
    return;
  }

  if (entry.pollingTimer !== null) {
    window.clearInterval(entry.pollingTimer);
    entry.pollingTimer = null;
  }

  entry.pollingMs = nextInterval;

  if (nextInterval <= 0) {
    return;
  }

  entry.pollingTimer = window.setInterval(
    () => {
      checkEntryForRefresh(entry, nextInterval);
    },
    Math.min(nextInterval, SCHEDULE_CHECK_MS),
  );
}

// --------------------------------------------------
// SSR INITIAL QUOTE
// --------------------------------------------------

function seedMarketQuote(
  symbol: string,
  range: ChartRange,
  chartInterval: ChartInterval | undefined,
  initialQuote: InitialMarketQuote | null | undefined,
) {
  if (
    !initialQuote ||
    initialQuote.data.id !== symbol ||
    !Number.isFinite(initialQuote.fetchedAt)
  ) {
    return;
  }

  const entry = getEntry(symbol, range, chartInterval);

  if (entry.snapshot.data || entry.fetchPromise) {
    return;
  }

  entry.lastSuccessAt = initialQuote.fetchedAt;

  publish(entry, {
    data: initialQuote.data,
    loading: false,
    error: null,
  });
}

// --------------------------------------------------
// VISIBILITY / NETWORK
// --------------------------------------------------

function refreshActiveQuotes() {
  if (!canRefresh()) return;

  for (const entry of store.values()) {
    checkEntryForRefresh(entry, RETURN_REFRESH_MIN_MS);
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    refreshActiveQuotes();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", refreshActiveQuotes);

  window.addEventListener("online", refreshActiveQuotes);

  document.addEventListener("visibilitychange", handleVisibilityChange);
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------

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
) {
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
    const session = getMarketSession(config);

    if (session.active && session.key !== null) {
      entry.finalCandidateKey = session.key;
    }
  }

  configurePolling(entry);

  // Initial requests are allowed while the market is closed.
  // Revisit stale cached data without enabling closed-market polling.
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
