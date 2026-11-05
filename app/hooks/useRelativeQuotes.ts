"use client";

import { useEffect, useMemo, useState } from "react";

export interface RelativeQuote {
  price: number;
  previousClose: number | null;
  change: number | null;
  percent: number | null;
}

type QuoteMap = Record<string, RelativeQuote>;
interface QuoteState {
  key: string;
  quotes: QuoteMap;
  loading: boolean;
  error: string | null;
}

const POLL_MS = 30_000;
const TIMEOUT_MS = 15_000;

export function useRelativeQuotes(symbols: string[]) {
  const key = JSON.stringify([...new Set(symbols)].sort());
  const requestedSymbols = useMemo(() => JSON.parse(key) as string[], [key]);
  const [state, setState] = useState<QuoteState>({
    key,
    quotes: {},
    loading: requestedSymbols.length > 0,
    error: null,
  });

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let controller: AbortController | null = null;

    setState({
      key,
      quotes: {},
      loading: requestedSymbols.length > 0,
      error: null,
    });
    if (requestedSymbols.length === 0) return;

    async function refresh() {
      if (disposed || inFlight || document.hidden || !navigator.onLine) return;
      inFlight = true;
      const requestController = new AbortController();
      controller = requestController;
      const timeout = window.setTimeout(
        () => requestController.abort(),
        TIMEOUT_MS,
      );

      try {
        const params = new URLSearchParams({
          symbols: requestedSymbols.join(","),
        });
        const response = await fetch(`/api/market-quotes?${params}`, {
          cache: "no-store",
          signal: requestController.signal,
        });
        if (!response.ok)
          throw new Error(`Quote request failed (${response.status})`);
        const json = (await response.json()) as { quotes?: QuoteMap };
        if (!json.quotes || typeof json.quotes !== "object") {
          throw new Error("Invalid quote response");
        }
        if (!disposed) {
          setState((previous) => ({
            key,
            quotes: { ...previous.quotes, ...json.quotes },
            loading: false,
            error: null,
          }));
        }
      } catch (error) {
        if (!disposed && !requestController.signal.aborted) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to refresh quotes",
          }));
        }
      } finally {
        window.clearTimeout(timeout);
        if (controller === requestController) controller = null;
        inFlight = false;
      }
    }

    function refreshOnReturn() {
      if (!document.hidden) void refresh();
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("online", refreshOnReturn);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("online", refreshOnReturn);
    };
  }, [key, requestedSymbols]);

  if (state.key !== key) {
    return {
      quotes: {} as QuoteMap,
      loading: requestedSymbols.length > 0,
      error: null as string | null,
    };
  }
  return { quotes: state.quotes, loading: state.loading, error: state.error };
}
