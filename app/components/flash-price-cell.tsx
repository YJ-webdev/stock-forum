// components/flash-price-cell.tsx
"use client";

import * as React from "react";

export function FlashPriceCell({ price }: { price: number }) {
  const [flashClass, setFlashClass] = React.useState<string>("");
  const prevPriceRef = React.useRef<number>(price);

  React.useEffect(() => {
    const prevPrice = prevPriceRef.current;

    if (price > prevPrice) {
      setFlashClass(
        "animate-flash-green text-emerald-600 dark:text-emerald-400",
      );
    } else if (price < prevPrice) {
      setFlashClass("animate-flash-red text-rose-600 dark:text-rose-400");
    }

    prevPriceRef.current = price;

    // Reset flash effect after 1 second
    const timer = setTimeout(() => {
      setFlashClass("");
    }, 1000);

    return () => clearTimeout(timer);
  }, [price]);

  return (
    <div
      className={`text-right text-xs font-semibold tabular-nums px-2 py-0.5 rounded transition-colors ${flashClass}`}
    >
      {price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}
    </div>
  );
}
