import { useEffect, useRef, useState } from "react";

export type FlashState = "up" | "down" | "none";

export function usePriceFlash(currentPrice: number): FlashState {
  const [flash, setFlash] = useState<FlashState>("none");
  const prevPriceRef = useRef<number>(currentPrice);

  useEffect(() => {
    const prevPrice = prevPriceRef.current;

    if (currentPrice > prevPrice) {
      setFlash("up");
    } else if (currentPrice < prevPrice) {
      setFlash("down");
    }

    // Update reference for the next cycle
    prevPriceRef.current = currentPrice;

    // Reset flash state after animation duration (1 second)
    const timer = setTimeout(() => {
      setFlash("none");
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentPrice]);

  return flash;
}
