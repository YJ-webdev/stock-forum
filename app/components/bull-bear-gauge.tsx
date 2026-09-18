export function BullBearGauge({
  bullish,
  bearish,
}: {
  bullish: number;
  bearish: number;
}) {
  const total = bullish + bearish;

  const bullishPercent = total > 0 ? Math.round((bullish / total) * 100) : 50;

  const bearishPercent = 100 - bullishPercent;

  return (
    <div className="mt-6 w-full">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-emerald-600">
          Bullish {bullishPercent}%
        </span>

        <span className="font-medium text-rose-700">
          {bearishPercent}% Bearish
        </span>
      </div>

      <div className="flex h-6 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="bg-emerald-600 transition-[width] duration-300"
          style={{ width: `${bullishPercent}%` }}
        />

        <div
          className="bg-rose-700 transition-[width] duration-300"
          style={{ width: `${bearishPercent}%` }}
        />
      </div>

      <div className="mt-1.5 text-[12px] text-zinc-500">
        {total.toLocaleString()} votes
      </div>
    </div>
  );
}
