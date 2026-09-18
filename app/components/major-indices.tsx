import Link from "next/link";

const MAJOR_INDICES = [
  { symbol: "^GSPC", displaySymbol: "SPX", percent: 0.61 },
  { symbol: "^NDX", displaySymbol: "NDX", percent: 1.18 },
  { symbol: "^DJI", displaySymbol: "DJI", percent: 0.42 },
  { symbol: "^RUT", displaySymbol: "RUT", percent: -0.21 },
  { symbol: "^GSPTSE", displaySymbol: "TSX", percent: 0.35 },
  { symbol: "^BVSP", displaySymbol: "IBOV", percent: 0.73 },
  { symbol: "^MXX", displaySymbol: "MEXBOL", percent: -0.06 },
  { symbol: "^N225", displaySymbol: "N225", percent: 1.71 },
  { symbol: "1306.T", displaySymbol: "TOPIX", percent: 1.12 },
];

export function MajorIndices() {
  return (
    <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
      {MAJOR_INDICES.map((item) => {
        const positive = item.percent >= 0;

        return (
          <Link
            key={item.symbol}
            href={`/market?symbol=${encodeURIComponent(item.symbol)}`}
            className="
                group rounded-lg px-2 py-2
                transition-colors
                hover:bg-zinc-100
                dark:hover:bg-zinc-800/60
              "
          >
            <div className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
              {item.displaySymbol}
            </div>

            <div
              className={`mt-0.5 text-[12px] font-medium ${
                positive
                  ? "text-emerald-600 dark:text-emerald-500"
                  : "text-rose-600 dark:text-rose-500"
              }`}
            >
              {positive ? "+" : ""}
              {item.percent.toFixed(2)}%
            </div>
          </Link>
        );
      })}
    </div>
  );
}
