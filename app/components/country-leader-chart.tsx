"use client";

export interface CountryData {
  rank: string;
  country: string;
  code: string;
  flagUrl: string;
  totalVolume: string;
  activeBettors: string;
  winRate: string;
}

const COUNTRY_DATA: CountryData[] = [
  {
    rank: "01",
    country: "United States",
    code: "US",
    flagUrl: "https://flagcdn.com/w80/us.png",
    totalVolume: "$1,420,850",
    activeBettors: "14,290",
    winRate: "+68.4%",
  },
  {
    rank: "02",
    country: "United Kingdom",
    code: "GB",
    flagUrl: "https://flagcdn.com/w80/gb.png",
    totalVolume: "$980,400",
    activeBettors: "8,910",
    winRate: "+64.1%",
  },
  {
    rank: "03",
    country: "South Korea",
    code: "KR",
    flagUrl: "https://flagcdn.com/w80/kr.png",
    totalVolume: "$850,200",
    activeBettors: "7,450",
    winRate: "+71.2%",
  },
  {
    rank: "04",
    country: "Japan",
    code: "JP",
    flagUrl: "https://flagcdn.com/w80/jp.png",
    totalVolume: "$620,150",
    activeBettors: "5,120",
    winRate: "+59.8%",
  },
  {
    rank: "05",
    country: "Germany",
    code: "DE",
    flagUrl: "https://flagcdn.com/w80/de.png",
    totalVolume: "$415,900",
    activeBettors: "3,890",
    winRate: "+58.3%",
  },
];

export function CountryLeaderboard() {
  return (
    <div className="w-2xs py-4">
      {/* Header */}
      <div className="flex justify-between items-center px-3">
        <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
          top countries
        </p>
        {/* <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Global Live
          </span>
        </div> */}
      </div>

      {/* List */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {COUNTRY_DATA.map((c) => (
          <div
            key={c.code}
            className="py-2.5 px-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
          >
            {/* Rank, Flag, Country Name */}
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-500 w-5">
                {c.rank}
              </span>

              {/* 국기 아바타 */}
              <div className="h-6 w-8 rounded overflow-hidden border border-zinc-200/80 dark:border-zinc-700/50 shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={c.flagUrl}
                  alt={c.country}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {c.country}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                  {c.activeBettors} bettors
                </span>
              </div>
            </div>

            {/* Volume & Win Rate */}
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {c.totalVolume}
              </div>
              <div className="text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {c.winRate}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
