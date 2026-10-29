"use client";

import { useEffect, useRef, useState } from "react";

export type FlashState = "up" | "down" | "none";

export function usePriceFlash(currentPrice: number): FlashState {
  const [flash, setFlash] = useState<FlashState>("none");
  const previousPriceRef = useRef(currentPrice);

  useEffect(() => {
    const previousPrice = previousPriceRef.current;
    previousPriceRef.current = currentPrice;

    if (
      !Number.isFinite(currentPrice) ||
      !Number.isFinite(previousPrice) ||
      currentPrice === previousPrice
    ) {
      setFlash("none");
      return;
    }

    setFlash(currentPrice > previousPrice ? "up" : "down");

    const timer = window.setTimeout(() => {
      setFlash("none");
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [currentPrice]);

  return flash;
}
