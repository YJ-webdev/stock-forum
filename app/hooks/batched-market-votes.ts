"use client";

import {
  getMarketVoteListStats,
  type MarketVoteListStats,
} from "@/app/actions/market-vote";

interface MarketVoteRequest {
  symbol: string;
  sessionDate: Date;
  viewerId: string | null;
}

interface PendingRequest {
  key: string;
  viewerKey: string;
  symbol: string;
  sessionMs: number;
  resolve: (result: MarketVoteListStats) => void;
  reject: (error: Error) => void;
}

const BATCH_DELAY_MS = 20;

// Share only requests that are queued or currently in flight.
const inFlight = new Map<string, Promise<MarketVoteListStats>>();

let pending: PendingRequest[] = [];
let flushTimer: number | null = null;

function getRequestKey({ viewerId, symbol, sessionDate }: MarketVoteRequest) {
  return JSON.stringify([viewerId, symbol, sessionDate.getTime()]);
}

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Failed to load market voting data.");
}

async function executeBatch(requests: PendingRequest[]) {
  try {
    const results = await getMarketVoteListStats({
      markets: requests.map((request) => ({
        symbol: request.symbol,
        sessionDate: new Date(request.sessionMs),
      })),
    });

    for (const request of requests) {
      const result = results[request.symbol];

      if (!result) {
        request.reject(new Error("Market voting data was not returned."));
        continue;
      }

      request.resolve(result);
    }
  } catch (error) {
    const failure = toError(error);

    for (const request of requests) {
      request.reject(failure);
    }
  }
}

function flushRequests() {
  flushTimer = null;

  const requests = pending;
  pending = [];

  // Keep requests from different viewer contexts separate.
  const requestsByViewer = new Map<string, PendingRequest[]>();

  for (const request of requests) {
    const group = requestsByViewer.get(request.viewerKey) ?? [];

    group.push(request);
    requestsByViewer.set(request.viewerKey, group);
  }

  for (const viewerRequests of requestsByViewer.values()) {
    const batches: PendingRequest[][] = [];

    for (const request of viewerRequests) {
      // The server action returns a map keyed by symbol,
      // so one batch must not contain two sessions
      // for the same symbol.
      let batch = batches.find(
        (items) => !items.some((item) => item.symbol === request.symbol),
      );

      if (!batch) {
        batch = [];
        batches.push(batch);
      }

      batch.push(request);
    }

    for (const batch of batches) {
      void executeBatch(batch);
    }
  }
}

export function getBatchedMarketVotes({
  symbol,
  sessionDate,
  viewerId,
}: MarketVoteRequest): Promise<MarketVoteListStats> {
  if (
    !(sessionDate instanceof Date) ||
    !Number.isFinite(sessionDate.getTime())
  ) {
    return Promise.reject(new Error("Invalid prediction session."));
  }

  const request = {
    symbol,
    sessionDate,
    viewerId,
  };

  const key = getRequestKey(request);
  const existing = inFlight.get(key);

  if (existing) {
    return existing;
  }

  const operation = new Promise<MarketVoteListStats>((resolve, reject) => {
    pending.push({
      key,
      viewerKey: JSON.stringify(viewerId),
      symbol,
      sessionMs: sessionDate.getTime(),
      resolve,
      reject,
    });
  });

  const tracked = operation.finally(() => {
    if (inFlight.get(key) === tracked) {
      inFlight.delete(key);
    }
  });

  inFlight.set(key, tracked);

  if (flushTimer === null) {
    flushTimer = window.setTimeout(flushRequests, BATCH_DELAY_MS);
  }

  return tracked;
}
