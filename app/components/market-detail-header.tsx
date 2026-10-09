"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

import { Numeric } from "./numeric";
import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_LABELS, MARKET_DETAIL_LABELS } from "@/lib/data/translations";

export interface MarketDetailHeaderProps {
  rawPrice?: number;
  value?: string;
  change: string;
  percent: string;
  isPositive: boolean;
  selectedRange: string;
  updatedAt?: number | string;
  onAddToList?: () => void;
  exchangeTimezone: string;

  currentUser?: {
    language?: string | null;
  } | null;
}

export function MarketDetailHeader({
  rawPrice,
  value,
  change = "+0.00",
  percent = "+0.00%",
  isPositive,
  selectedRange = "1D",
  updatedAt,
  exchangeTimezone,
  currentUser,
}: MarketDetailHeaderProps) {
  const language = resolveLanguage(currentUser?.language);
  const marketLabels = MARKET_LABELS[language];
  const detailLabels = MARKET_DETAIL_LABELS[language];

  const displayPrice =
    value ??
    (rawPrice !== undefined
      ? rawPrice.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-");

  const changeNumber = Number(change.replace(/,/g, "").trim());

  const formattedChange = Number.isFinite(changeNumber)
    ? changeNumber.toLocaleString("en-US", {
        useGrouping: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: "exceptZero",
      })
    : change;

  const formatMarketTimestamp = (dateInput?: number | string) => {
    const date = dateInput !== undefined ? new Date(dateInput) : new Date();

    if (Number.isNaN(date.getTime())) return "-";

    try {
      return new Intl.DateTimeFormat(language, {
        timeZone: exchangeTimezone,
        calendar: "gregory",
        numberingSystem: "latn",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
        timeZoneName: "shortOffset",
      }).format(date);
    } catch {
      return date.toISOString();
    }
  };

  const percentNumber = Number(percent.replace(/[,%]/g, "").trim());

  const formattedPercent = Number.isFinite(percentNumber)
    ? `${percentNumber.toLocaleString("en-US", {
        useGrouping: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: "exceptZero",
      })}%`
    : percent;

  const rangeLabel =
    detailLabels.ranges[selectedRange] ?? detailLabels.ranges["1D"];

  const colorClass = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-[#cf0000] dark:text-[#ff4545]";

  return (
    <div className="flex min-w-0 items-center gap-3 px-4">
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tracking-tight sm:flex-nowrap md:tracking-normal">
          <Numeric className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-300">
            {displayPrice}
          </Numeric>

          <div
            className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-lg ${colorClass}`}
          >
            {isPositive ? (
              <TrendingUp className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-5 shrink-0" aria-hidden="true" />
            )}
            <span className="jakarta">{formattedPercent}</span>{" "}
            <span className="jakarta">({formattedChange})</span>
            <span className="jakarta whitespace-nowrap text-sm">
              {rangeLabel}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
          <span>{formatMarketTimestamp(updatedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{marketLabels.data_delayed.replace("{minutes}", "15")}</span>
          <span aria-hidden="true">·</span>

          <button
            type="button"
            onClick={() => alert(detailLabels.disclaimer_message)}
            className="cursor-pointer hover:underline"
          >
            {marketLabels.disclaimer}
          </button>
        </div>
      </div>
    </div>
  );
}
