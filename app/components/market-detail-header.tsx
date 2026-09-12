"use client";

import {
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface MarketDetailHeaderProps {
  symbol: string;
  name: string;
  rawPrice?: number;
  value?: string;
  change: string;
  percent: string;
  isPositive: boolean;
  selectedRange: string;
  updatedAt?: number | string;
  onBack?: () => void;
  onAddToList?: () => void;
  categoryTitle?: string;
  displaySymbol: string;
  exchangeTimezone: string;
}

export function MarketDetailHeader({
  name,
  rawPrice,
  value,
  change = "+0.00",
  percent = "+0.00%",
  isPositive,
  selectedRange = "1D",
  updatedAt,
  categoryTitle,
  exchangeTimezone,
}: MarketDetailHeaderProps) {
  const router = useRouter();

  // Dynamically resolve price string from API value prop or raw numeric fallback
  const displayPrice =
    value ??
    (rawPrice !== undefined
      ? rawPrice.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-");

  const formatMarketTimestamp = (dateInput?: number | string) => {
    const date = dateInput ? new Date(dateInput) : new Date();

    try {
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: exchangeTimezone,
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "shortOffset",
      });

      const parts = formatter.formatToParts(date);
      const day = parts.find((p) => p.type === "day")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const hour = parts.find((p) => p.type === "hour")?.value;
      const minute = parts.find((p) => p.type === "minute")?.value;
      const second = parts.find((p) => p.type === "second")?.value;

      let tz = parts.find((p) => p.type === "timeZoneName")?.value || "";
      tz = tz.replace("GMT", "UTC");

      return `${day} ${month}, ${hour}:${minute}:${second} ${tz}`;
    } catch (_e) {
      return date.toISOString();
    }
  };

  const rangeLabelMap: Record<string, string> = {
    "1D": "Today",
    "5D": "Past 5 Days",
    "1M": "Past Month",
    "3M": "Past 3 Months",
    "6M": "Past 6 Months",
    YTD: "Year to Date",
    "1Y": "Past Year",
    "5Y": "Past 5 Years",
    MAX: "All Time",
  };

  const rangeLabel = rangeLabelMap[selectedRange] || "Today";
  const colorClass = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-[#cf0000] dark:text-[#cf0000]";

  const handleHomeClick = () => {
    router.push("/");
  };

  console.log("HEADER PRICE:", {
    rawPrice,
    value,
    displayPrice,
  });

  return (
    <div className="w-full relative p-4">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300 font-medium">
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <span>Home</span>
          </button>

          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => {}}
            className="flex capitalize items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <span>{categoryTitle}</span>
          </button>
        </div>
      </div>

      {/* Header Title */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[44px] font-bold text-gray-500/50 dark:text-zinc-700 tracking-tight leading-none">
          {name}
        </h1>
      </div>

      <div className="flex items-center gap-3 mt-1.5">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-medium text-zinc-900 dark:text-zinc-100">
              {displayPrice}
            </span>

            <div className={`flex items-center gap-1.5 text-lg ${colorClass}`}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span>{percent}</span>
              <span>({change})</span>
              <span>{rangeLabel}</span>
            </div>
          </div>

          {/* Timestamp Display */}
          <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-normal flex items-center gap-1.5">
            <span>{formatMarketTimestamp(updatedAt)}</span>
            <span>·</span>
            <span>Data delayed 15m</span>
            <span>·</span>
            <button
              onClick={() =>
                alert(
                  "Market data is provided for informational purposes only.",
                )
              }
              className="hover:underline cursor-pointer"
            >
              Disclaimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
