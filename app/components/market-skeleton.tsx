// app/components/market-skeleton.tsx

interface MarketSkeletonProps {
  className?: string;
}

export function MarketSkeleton({ className = "" }: MarketSkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800/50 ${className}`}
    />
  );
}
