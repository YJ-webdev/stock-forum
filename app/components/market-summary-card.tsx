"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatPrice, formatPercentChange } from "@/lib/utils/format-number";
import { IndexLogo } from "./index-logo";

interface ChartPoint {
  timestampMs: number;
  timeLabel: string;
  hourlyLabel: string;
  minute: string;
  price: number;
}

interface MarketSummaryCardProps {
  title: string;
  symbolBadge: string;
  ticker: string;

  changePercent?: number;
  isClosed?: boolean;
}

// 🌐 Browser-native dynamic timezone formatting for global visitors
function formatUserDateTime(timestampMs: number) {
  const date = new Date(timestampMs);

  // 1. Local Date String (e.g., "09 9월 '26" or locale equivalent)
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  const dateStr = `${month} ${day}월 '${year}`;

  // 2. Local 24-hour Time (e.g., "02:40" or "16:00")
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // 3. Dynamic UTC Offset String (e.g., "UTC+9", "UTC-4", "UTC+0")
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetHours = offsetMinutes / 60;
  const utcSign = offsetHours >= 0 ? "+" : "";
  const timeZoneStr = `${hours}:${minutes} UTC${utcSign}${offsetHours}`;

  return {
    dateStr,
    timeZoneStr,
    timeLabel: `${hours}:${minutes}`,
    hourlyLabel: `${hours}:00`,
    minute: minutes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as ChartPoint;
  const { dateStr, timeZoneStr } = formatUserDateTime(data.timestampMs);
  const formattedPrice = formatPrice(data.price).replace("$", "");

  return (
    <div className="bg-zinc-800 text-white px-3 py-2 rounded-lg shadow-xl text-center border border-zinc-700/50 pointer-events-none min-w-27.5">
      <div className="font-extrabold text-sm tracking-tight text-zinc-100">
        {formattedPrice}
      </div>
      <div className="text-[11px] font-medium text-zinc-300 mt-0.5">
        {dateStr}
      </div>
      <div className="text-[11px] font-medium text-zinc-400">{timeZoneStr}</div>
    </div>
  );
}

export function MarketSummaryCard({
  title,
  symbolBadge,
  ticker,

  changePercent: initialChangePercent = 0,
  isClosed,
}: MarketSummaryCardProps) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [hourlyTicks, setHourlyTicks] = useState<string[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [changePercent, setChangePercent] = useState(initialChangePercent);
  const [loading, setLoading] = useState(true);

  const isPositive = changePercent >= 0;
  const strokeColor = isPositive ? "#0D9488" : "#E11D48";

  useEffect(() => {
    async function fetchChart() {
      try {
        setLoading(true);
        const res = await fetch(`/api/candles?symbol=${ticker}`);
        const data = await res.json();

        if (data.currentPrice) setCurrentPrice(data.currentPrice);
        if (data.changePercent !== undefined)
          setChangePercent(data.changePercent);

        if (data.points && Array.isArray(data.points)) {
          const formattedPoints = data.points
            .map((pt: { timestampMs: number; price: number }) => {
              if (!pt.timestampMs) return null;

              const formatted = formatUserDateTime(pt.timestampMs);

              return {
                timestampMs: pt.timestampMs,
                timeLabel: formatted.timeLabel,
                hourlyLabel: formatted.hourlyLabel,
                minute: formatted.minute,
                price: pt.price,
              };
            })
            .filter(Boolean) as ChartPoint[];

          setChartData(formattedPoints);

          // Unique X-Axis hourly ticks based on user local hour
          const hourly = Array.from(
            new Set(formattedPoints.map((pt) => pt.hourlyLabel)),
          );
          setHourlyTicks(hourly);
        }
      } catch (err) {
        console.error("Failed to load chart points:", err);
      } finally {
        setLoading(false);
      }
    }

    if (ticker) {
      fetchChart();
    }
  }, [ticker]);

  return (
    <div className="w-full">
      {/* Top Bar */}
      <div className="flex items-center gap-2">
        <IndexLogo symbol={symbolBadge} size={60} />
        <div className="flex flex-col items-start leading-tight">
          <div className="flex items-center gap-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
              {symbolBadge}
            </span>
            {/* 🟢 Market Status Indicator */}
            {isClosed ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 ml-0.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                closed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ml-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                open
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-semibold text-zinc-900 dark:text-zinc-50 tracking-wide">
                {formatPrice(currentPrice)}
              </span>
              <span className="text-xs font-light uppercase">Point</span>
            </div>
            <span
              className={`text-lg font-bold ${
                isPositive ? "text-teal-600 dark:text-teal-400" : "text-red-600"
              }`}
            >
              {formatPercentChange(changePercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
            <span className="text-sm text-zinc-400">Loading chart...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
            <span className="text-sm text-zinc-400">
              No intraday market data available
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={strokeColor}
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor={strokeColor}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timeLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#A1A1AA" }}
                ticks={hourlyTicks.length > 0 ? hourlyTicks : undefined}
              />
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#chartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
