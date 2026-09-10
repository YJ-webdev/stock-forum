"use client";

import { useEffect, useState } from "react";

export function useSimulatedLivePrice(basePrice: number) {
  const [price, setPrice] = useState(basePrice);

  useEffect(() => {
    if (!basePrice) return;

    // 2초(2000ms)마다 가격 업데이트
    const interval = setInterval(() => {
      // 미세한 가격 변동 (±0.01% ~ 0.03%)
      const delta = (Math.random() - 0.49) * (basePrice * 0.0003);

      setPrice((prev) => prev + delta);
    }, 3000);

    return () => clearInterval(interval);
  }, [basePrice]);

  return { price };
}
