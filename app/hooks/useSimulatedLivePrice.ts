"use client";

import { useEffect, useState } from "react";

export function useSimulatedLivePrice(basePrice: number) {
  const [price, setPrice] = useState(basePrice);

  useEffect(() => {
    if (!basePrice) return;

    const interval = setInterval(() => {
      const delta = (Math.random() - 0.49) * (basePrice * 0.0003);

      setPrice((prev) => prev + delta);
    }, 3000);

    return () => clearInterval(interval);
  }, [basePrice]);

  return { price };
}
