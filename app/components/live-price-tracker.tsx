"use client";

import { useEffect, useState } from "react";
import { MarketPriceUpdate } from "@/app/api/prices/route";

export function LivePriceTracker() {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const eventSource = new EventSource("/api/prices");

    eventSource.onmessage = (event) => {
      // Typed to match the MarketPriceUpdate[] emitted by your SSE route
      const data: MarketPriceUpdate[] = JSON.parse(event.data);
      setPrices((prev) => {
        const updated = { ...prev };
        data.forEach((tick) => {
          updated[tick.symbol] = tick.lastPrice;
        });
        return updated;
      });
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="flex flex-wrap gap-4 p-4 border rounded-xl bg-background font-mono text-sm">
      {Object.entries(prices).map(([symbol, price]) => (
        <div key={symbol} className="flex items-center gap-2">
          <span className="font-bold">{symbol}:</span>
          <span className="text-emerald-500">${price.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
