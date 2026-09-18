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

  const radius = 41;
  const circumference = 2 * Math.PI * radius;

  const bullishLength = (bullishPercent / 100) * circumference;
  const bearishLength = (bearishPercent / 100) * circumference;

  return (
    <div className="flex w-full flex-col items-center">
      {/* Gauge */}
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {/* Background */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-zinc-200 dark:text-zinc-800"
          />

          {/* Bullish */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${bullishLength} ${circumference}`}
            className="text-emerald-600 transition-all duration-500"
          />

          {/* Bearish */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${bearishLength} ${circumference}`}
            strokeDashoffset={-bullishLength}
            className="text-rose-700 transition-all duration-500"
          />
        </svg>

        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-emerald-600">
            {bullishPercent}%
          </span>

          <span className="mt-0.5 text-[12px] text-zinc-500">bullish</span>
        </div>
      </div>

      {/* Percentages */}
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        <span className="text-emerald-600">Bull {bullishPercent}%</span>

        <span className="text-zinc-300 dark:text-zinc-700">•</span>

        <span className="text-rose-700">Bear {bearishPercent}%</span>
      </div>

      {/* Votes */}
      <span className="mt-1 text-[11px] text-zinc-400">
        {total.toLocaleString()} votes
      </span>
    </div>
  );
}
