export function SparklineLoading({
  width = 120,
  height = 40,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className="flex max-w-full shrink-0 items-center"
      style={{ width, height }}
    >
      <div
        aria-hidden="true"
        className="relative h-px w-full overflow-hidden bg-zinc-200 dark:bg-zinc-700"
      >
        <span className="sparkline-shimmer absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-zinc-400/70 to-transparent dark:via-zinc-400/60" />
      </div>

      <style jsx>{`
        .sparkline-shimmer {
          animation: sparkline-shimmer 1.4s ease-in-out infinite;
        }

        @keyframes sparkline-shimmer {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(300%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sparkline-shimmer {
            animation: none;
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
