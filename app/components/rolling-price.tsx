"use client";

interface RollingPriceProps {
  template?: string;
  intervalMs?: number;
  className?: string;
}

export function RollingPrice({
  template = "00,000.00",
  className = "",
}: RollingPriceProps) {
  return (
    <span
      role="status"
      aria-label="Loading market data"
      className={`relative inline-block overflow-hidden rounded-sm align-middle ${className}`}
      style={{
        width: `${template.length}ch`,
        height: "0.65em",
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-zinc-200/70 dark:bg-zinc-700/50"
      />

      <span
        aria-hidden="true"
        className="price-shimmer absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-white/60 to-transparent dark:via-zinc-500/30"
      />

      <style jsx>{`
        .price-shimmer {
          animation: price-shimmer 1.6s ease-in-out infinite;
        }

        @keyframes price-shimmer {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(200%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .price-shimmer {
            animation: none;
            display: none;
          }
        }
      `}</style>
    </span>
  );
}
