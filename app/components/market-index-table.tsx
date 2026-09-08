"use client";

export interface IndexMarketData {
  index: string;
  name: string;
  previous: number;
  today: number;
  change: number;
  changePercent: string;
}

const MARKET_DATA: IndexMarketData[] = [
  {
    index: "US500",
    name: "S&P 500",
    previous: 100,
    today: 90,
    change: -10,
    changePercent: "-10.00%",
  },
  {
    index: "US100",
    name: "Nasdaq 100",
    previous: 18500,
    today: 18725,
    change: 225,
    changePercent: "+1.22%",
  },
  {
    index: "DJI",
    name: "Dow Jones Industrial",
    previous: 40800,
    today: 40650,
    change: -150,
    changePercent: "-0.37%",
  },
];

export function MarketIndexTable() {
  return (
    <div className="w-2xs">
      {/* Upper Bar */}
      <div className="flex justify-between items-center mb-3 px-3">
        <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
          market indices
        </p>

        {/* <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Real-time
          </span>
        </div> */}
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-12 px-3 py-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
        <span className="col-span-4">Index</span>
        <span className="col-span-3 text-right">Previous</span>
        <span className="col-span-3 text-right">Today</span>
        <span className="col-span-2 text-right"> %</span>
      </div>

      {/* List Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {MARKET_DATA.map((item) => {
          const isNegative = item.change < 0;

          return (
            <div
              key={item.index}
              className="grid grid-cols-12 px-3 py-2.5 items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              {/* Index Symbol & Name */}
              <div className="col-span-4 min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.index}
                </div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  {item.name}
                </div>
              </div>

              {/* Previous Price */}
              <div className="col-span-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {item.previous.toLocaleString()}
              </div>

              {/* Today Price */}
              <div className="col-span-3 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {item.today.toLocaleString()}
              </div>

              {/* Change % */}
              <div
                className={`col-span-2 text-right text-xs font-semibold tabular-nums ${
                  isNegative
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {item.changePercent}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
