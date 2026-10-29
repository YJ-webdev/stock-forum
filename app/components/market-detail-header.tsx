"use client";

import { memo, useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_DETAIL_LABELS, MARKET_LABELS } from "@/lib/data/translations";

import { Numeric } from "./numeric";

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
  currentUser?: { language?: string | null } | null;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const changeFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

function formatSignedNumber(value: string, percentage = false) {
  const normalized = value.replace(/[,%]/g, "").trim();
  if (!normalized) return value;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return value;
  return `${changeFormatter.format(number)}${percentage ? "%" : ""}`;
}

export const MarketDetailHeader = memo(function MarketDetailHeader({
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
    (rawPrice !== undefined && Number.isFinite(rawPrice)
      ? priceFormatter.format(rawPrice)
      : "—");

  const timestampFormatter = useMemo(() => {
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
      });
    } catch {
      return null;
    }
  }, [language, exchangeTimezone]);

  const timestamp = useMemo(() => {
    if (updatedAt === undefined) return "—";
    const date = new Date(updatedAt);
    if (!Number.isFinite(date.getTime())) return "—";
    return timestampFormatter?.format(date) ?? date.toISOString();
  }, [updatedAt, timestampFormatter]);

  const rangeLabel =
    detailLabels.ranges[selectedRange] ?? detailLabels.ranges["1D"];
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-[#cf0000] dark:text-[#ff4545]";

  return (
    <div className="flex min-w-0 items-center gap-3 px-4">
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tracking-tight sm:flex-nowrap md:tracking-normal">
          <Numeric className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {displayPrice}
          </Numeric>

          <div
            className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-lg ${colorClass}`}
          >
            <TrendIcon className="size-5 shrink-0" aria-hidden="true" />
            <span className="jakarta">{formatSignedNumber(percent, true)}</span>
            <span className="jakarta">({formatSignedNumber(change)})</span>
            <span className="jakarta whitespace-nowrap text-sm">
              {rangeLabel}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
          <span>{timestamp}</span>
          <span aria-hidden="true">·</span>
          <span>{marketLabels.data_delayed.replace("{minutes}", "15")}</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => window.alert(detailLabels.disclaimer_message)}
            className="cursor-pointer rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {marketLabels.disclaimer}
          </button>
        </div>
      </div>
    </div>
  );
});
