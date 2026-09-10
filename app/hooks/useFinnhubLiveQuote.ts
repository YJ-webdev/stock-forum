// app/hooks/useFinnhubLiveQuote.ts
"use client";

import { useEffect, useState } from "react";

export function useFinnhubLiveQuote(symbol: string, initialPrice: number) {
  const [livePrice, setLivePrice] = useState<number>(initialPrice);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (!symbol) return;

    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) return;

    const socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "subscribe", symbol }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "trade" && data.data?.[0]?.p) {
          const newPrice = data.data[0].p;
          setLivePrice(newPrice);

          setIsUpdating(true);
          setTimeout(() => setIsUpdating(false), 300);
        }
      } catch (err) {
        console.error("WebSocket message parsing error:", err);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "unsubscribe", symbol }));
        socket.close();
      }
    };
  }, [symbol]);

  return { livePrice, isUpdating };
}
