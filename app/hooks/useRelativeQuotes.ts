"use client";

import { useEffect, useState } from "react";

export interface RelativeQuote {
  price: number;
  previousClose: number | null;
  change: number | null;
  percent: number | null;
}

type QuoteMap = Record<string, RelativeQuote>;

interface CachedResult {
  quotes: QuoteMap;
  fetchedAt: number;
}

const cache = new Map<string, CachedResult>();
const pending = new Map<string, Promise<CachedResult>>();
const FRESH_MS = 30_000;

function loadQuotes(key: string): Promise<CachedResult> {
  const existing = pending.get(key);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    const controller = new AbortController();

    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const params = new URLSearchParams({
        symbols: (JSON.parse(key) as string[]).join(","),
      });

      const response = await fetch(`/api/market-quotes?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load quotes (${response.status})`);
      }

      const json = await response.json();

      const result: CachedResult = {
        quotes: json.quotes ?? {},
        fetchedAt: Date.now(),
      };

      cache.set(key, result);

      return result;
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  pending.set(key, request);

  void request.then(
    () => pending.delete(key),
    () => pending.delete(key),
  );

  return request;
}

export function useRelativeQuotes(symbols: string[]) {
  const key = JSON.stringify([...new Set(symbols)].sort());

  const [state, setState] = useState<{
    key: string;
    quotes: QuoteMap;
    loading: boolean;
    error: string | null;
  }>(() => ({
    key,
    quotes: cache.get(key)?.quotes ?? {},
    loading: symbols.length > 0,
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;

    const cached = cache.get(key);
    const empty = (JSON.parse(key) as string[]).length === 0;

    if (empty || (cached && Date.now() - cached.fetchedAt < FRESH_MS)) {
      setState({
        key,
        quotes: cached?.quotes ?? {},
        loading: false,
        error: null,
      });

      return;
    }

    setState({
      key,
      quotes: cached?.quotes ?? {},
      loading: true,
      error: null,
    });

    void loadQuotes(key).then(
      (result) => {
        if (!cancelled) {
          setState({
            key,
            quotes: result.quotes,
            loading: false,
            error: null,
          });
        }
      },
      (error) => {
        if (!cancelled) {
          setState({
            key,
            quotes: cached?.quotes ?? {},
            loading: false,
            error:
              error instanceof Error ? error.message : "Failed to load quotes",
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [key]);

  if (state.key !== key) {
    return {
      quotes: cache.get(key)?.quotes ?? {},
      loading: symbols.length > 0,
      error: null,
    };
  }

  return state;
}
